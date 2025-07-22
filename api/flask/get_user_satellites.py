from pymongo import MongoClient
from datetime import datetime
from skyfield.api import load
from skyfield.iokit import parse_tle_file
from skyfield.api import wgs84
import os
import json
from flask import Flask, jsonify

app = Flask(__name__)

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

@app.route('/get_user_satellites', methods=['POST'])
def update(user_location, max_distance_km):
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
            'Location': {
                "type": "Point",
                "coordinates": [lon.degrees, lat.degrees]
                },
            'Altitude': wgs84.height_of(geocentric).km,
            'Timestamp': now.utc_strftime('%Y-%m-%dT%H:%M:%SZ'),
            }
        locations.append(loc)

    return json.dumps(locations)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
