import urllib.request
import json

url = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json"
try:
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    response = urllib.request.urlopen(req)
    data = json.loads(response.read().decode())
    
    # Collect all unique teams and their groups
    teams = {}
    for match in data.get("matches", []):
        group = match.get("group")
        team1 = match.get("team1")
        team2 = match.get("team2")
        if team1 and group:
            teams[team1] = group
        if team2 and group:
            teams[team2] = group
            
    # Sort and print
    sorted_teams = sorted(teams.items(), key=lambda x: (x[1], x[0]))
    print(f"Total Unique Teams: {len(sorted_teams)}")
    for team, group in sorted_teams:
        print(f"Team: {team} | Group: {group}")
        
except Exception as e:
    print(f"Error: {e}")
