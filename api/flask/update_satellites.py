from pymongo import MongoClient, UpdateOne
from skyfield.api import load
from skyfield.iokit import parse_tle_file
from skyfield.api import wgs84
from dotenv import load_dotenv, find_dotenv
import math
import os

dotenv_path = find_dotenv()
load_dotenv(dotenv_path)
url = os.getenv('MONGODB_URI')
client = MongoClient(url)
db = client["app"]
tlecollection = db["tles"]
collection = db["satellites"]
max_days = 7.0         # download again once 7 days old
name = 'stations.tle'

base = 'https://celestrak.org/NORAD/elements/gp.php'
url = base + '?GROUP=active&FORMAT=tle'

if not load.exists(name) or load.days_old(name) >= max_days:
    load.download(url, filename=name)

ts = load.timescale()

with load.open('stations.tle') as f:
    satellites = list(parse_tle_file(f, ts))
tledocuments = []

#print('Loaded', len(satellites), 'satellites')
documents = []
t = ts.now()

def is_invalid_point(doc):
    try:
        lon, lat = doc["Location"]["coordinates"]
        return not all(math.isfinite(c) for c in [lon, lat])
    except Exception:
        return True

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

requests = []
for doc in documents:
    query = {'Name': doc['Name']}
    update_data = {'$set': doc} # Use $set to update specific fields
    requests.append(UpdateOne(query, update_data, upsert=True))

# Execute the bulk write operation
result = collection.bulk_write(requests)