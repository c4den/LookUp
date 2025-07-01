# Required libraries to pip install:
# - pymongo
# - skyfield

from pymongo import MongoClient, UpdateOne
from skyfield.api import load
from skyfield.iokit import parse_tle_file
from skyfield.api import wgs84

# Connect to the database
client = MongoClient("mongodb+srv://root:CamAc2J%23%21149@lookup.v9jbv.mongodb.net/?retryWrites=true&w=majority&appName=LookUp")
db = client["app"]
collection = db["satellites"]

max_days = 7.0         # download TLEs again once 7 days old
name = 'stations.tle'  # local file where the TLEs are stored

# Separating URL into a base and extension so we can change what type of satellites we're looking for easily
base = 'https://celestrak.org/NORAD/elements/gp.php'
url = base + '?GROUP=active&FORMAT=tle'

if not load.exists(name) or load.days_old(name) >= max_days:
    load.download(url, filename=name)

ts = load.timescale()

with load.open('stations.tle') as f:
    satellites = list(parse_tle_file(f, ts))

print('Loaded', len(satellites), 'satellites')

# "documents" will hold all of the json documents that will be inserted into the database
documents = []

# update the timeframe so current positions are accurate
t = ts.now()

for satellite in satellites:
    geocentric = satellite.at(t)
    lat, lon = wgs84.latlon_of(geocentric)
    
    doc = {
        'Name': satellite.name,
        'Location': {
            "type": "point",
            "coordinates": [lon.degrees, lat.degrees]
            },
        'Altitude': wgs84.height_of(geocentric).km,
        'Timestamp': t.utc_strftime('%Y-%m-%dT%H:%M:%SZ'),
        }
    documents.append(doc)

print("Prepared", len(documents), "documents for upsert.")

# upsert documents into the database, this is the slowest part that's limited by our Atlas tier
requests = []
for doc in documents:
    query = {'Name': doc['Name']}
    update_data = {'$set': doc} # Use $set to update specific fields
    requests.append(UpdateOne(query, update_data, upsert=True))

# Execute the bulk write operation
result = collection.bulk_write(requests)

# Not all of the original TLEs will be upserted, as some of them are planned launches that aren't in orbit yet
print(f"Upserted {result.upserted_count} documents.")
print(f"Matched {result.matched_count} documents.")
print(f"Modified {result.modified_count} documents.")
