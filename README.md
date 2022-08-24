# urban-density-calculator
The Urban Density Calculator finds nearby points of interest and travel times. More specifically, this is a tool using Google Sheets and OpenRouteService to rate a location based on how many unique types of POIs are within 2km. This is useful for house shopping, comparing your friends' neighborhoods, or just generally judging a location based on how much of a suburban hell it is.

[!(calculating)](https://user-images.githubusercontent.com/20119855/186452927-71477691-38d6-46a6-8a8e-cf2419e8966e.mp4)

### How to use:
You can use this sheet to find the nearest POI of a given category, and then calculate the distance and travel time for it or any arbitrary location. You can make a new sheet for each location you want to run, and then compare their POI count and median distance in the "Rankings" sheet.

1. Copy this [Google Sheet](https://docs.google.com/spreadsheets/d/1eaJxVEaMj0vOXpr7RwDBqHoWrzY8MPAGrth3g0fguno/edit?usp=sharing) to your own drive so you can make edits.
2. Create an account on [OpenRouteService](https://openrouteservice.org/) and copy your API key.
3. Paste your API key in Z1.
4. Get the latitude and longitude of the location you want to run, and paste it into B2.
(Should look like 39.48074, -106.04746, more precision is fine and doesn't really matter. 5 decimals is accurate to 1.1m which is more than enough, though GMaps will happily give you 14.)
5. Name the location in A1.
6. Click the "Calculate" button and wait for the data to roll in!

See the "Example" sheet for a complete example (minus my API key).

You can also add your own specific targets. Leave the category column blank and paste in the coordinates of a location you want to get direction data from. The "Example" sheet has four of these.

![finished](https://user-images.githubusercontent.com/20119855/186457075-12116b4a-9884-42c6-bed0-16d3d271a637.png)
![rankings](https://user-images.githubusercontent.com/20119855/186453006-736f07e6-052c-4556-ad66-d9e43e927bf3.png)


### APIs
This uses the OpenRouteService API. The [ORS standard plan](https://openrouteservice.org/plans/) has API limits. Direction calls are limited to 40/min and 2000/day. POI search calls are limited to 60/min and a mere 500/day. Both the minute and daily limit may cause issues with the script.

ORS utilizes OpenStreetMap, not Google Maps. If you see missing or incorrect data, feel free to make an OpenStreetMap account and update it yourself! It may take up to two weeks for ORS to see the OSM changes.

### More Info
The script and the sheet are set up to find the nearest POI for each row with a set POI category. If it finds one, it fills in the coordinates and then finds both driving and cycling directions between your set address and the POI's address. This includes duration in minutes, miles to travel, and for cycling it includes total elevation changes. All of these are color coded based on my arbitrary values. Feel free to tweak any of these to your own liking, but be warned a lot of the script is hardcoded to specific columns and may take a little bit of scripting knowledge to work with your changes.

### Future Enhancements
The POI finding and directions methods (populateSheet, getNearest, getTravelTime) are not optimized for Google Apps Script, nor are they set up to avoid hitting ORS API limits. In fact, the inefficiencies in reading and writing values to the sheet are part of why it's slow enough to often not hit API limits. The other functions (rankAllScores, toggleRows, clearData) are fairly optimized.

The POI search will always find the nearest single POI of a given category. If I were more ambitious, an enhancement would be to count each usage of every category and on the second and third call, find the second and third closest POI.
