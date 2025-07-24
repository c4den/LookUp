from pymongo import MongoClient, UpdateOne
from skyfield.api import load
from skyfield.iokit import parse_tle_file
from skyfield.api import wgs84
from dotenv import load_dotenv, find_dotenv
import math
import os
import time

def is_invalid_point(doc):
    try:
        lon, lat = doc["Location"]["coordinates"]
        return not all(math.isfinite(c) for c in [lon, lat])
    except Exception:
        return True

def update_satellites():
    start = time.time()
    print("[Scheduler] Running satellite update...", flush = True)
    dotenv_path = find_dotenv()
    load_dotenv(dotenv_path)
    
    url = os.getenv('MONGODB_URI')
    client = MongoClient(url)
    db = client["app"]
    tlecollection = db["tles"]
    collection = db["satellites"]

    max_days = 7.0
    name = 'stations.tle'
    base = 'https://celestrak.org/NORAD/elements/gp.php'
    url = base + '?GROUP=active&FORMAT=tle'

    if not load.exists(name) or load.days_old(name) >= max_days:
        load.download(url, filename=name)

    ts = load.timescale()

    with load.open(name) as f:
        satellites = list(parse_tle_file(f, ts))

    t = ts.now()
    documents = []

    for satellite in satellites:
        geocentric = satellite.at(t)
        lat, lon = wgs84.latlon_of(geocentric)
        
        doc = {
            'Name': satellite.name,
            'Location': {
                "type": "Point",
                "coordinates": [lon.degrees, lat.degrees]
            },
            'Altitude': wgs84.height_of(geocentric).km,
            'Timestamp': t.utc_strftime('%Y-%m-%dT%H:%M:%SZ'),
        }
        if is_invalid_point(doc):
            continue
        documents.append(doc)

    requests = [
        UpdateOne({'Name': doc['Name']}, {'$set': doc}, upsert=True)
        for doc in documents
    ]

    if requests:
        collection.bulk_write(requests)
    end = time.time()
    print(f"[Scheduler] Done satellite update: took {end - start:.4f} seconds to execute", flush = True)