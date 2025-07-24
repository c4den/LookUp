from pymongo import MongoClient
from datetime import datetime
from skyfield.api import load
from skyfield.iokit import parse_tle_file
from skyfield.api import wgs84
import os
import json

def find_nearby_satellites(collection, user_location, max_distance_km):
    # Convert distance to meters (MongoDB uses meters)
    max_distance_m = max_distance_km * 1000
    return list(collection.find({
        "Location": {
            "$near": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": user_location
                },
                "$maxDistance": max_distance_m
            }
        }
    }))

def update(user_location, max_distance_km):
    print("Running update from get_user_satellites...", flush = True)
    # Set up MongoDB client
    url = os.getenv('MONGODB_URI')
    client = MongoClient(url)
    db = client["app"]
    satellites = db["satellites"]
    tles = db["tles"]

    ts = load.timescale()

    # load TLE data from local file
    with load.open('stations.tle') as f:
        tle_data = list(parse_tle_file(f, ts))

    nearby_satellites = find_nearby_satellites(satellites, user_location, max_distance_km)
    by_name = {sat.name: sat for sat in tle_data}
    now = ts.now()

    print(f"Nearby satellites to {user_location}:")
    locations = []
    for sat_doc in nearby_satellites:
        name = sat_doc["Name"]
        sat = by_name[name]
        geocentric = sat.at(now)
        lat, lon = wgs84.latlon_of(geocentric)
        height = wgs84.height_of(geocentric).km
        loc = {
            'Name': name,
            'lat': lat.degrees,
            'lon': lon.degrees,
            'Altitude': wgs84.height_of(geocentric).km,
            'Timestamp': now.utc_strftime('%Y-%m-%dT%H:%M:%SZ'),
            }
        locations.append(loc)

    return json.dumps(locations)

#locs = update([81.3789, 28.5384], 250)  # Example usage with dummy coordinates and distance
#print(locs)