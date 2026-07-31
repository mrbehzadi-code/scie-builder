import yaml
from pathlib import Path

MISSION_FILE = Path("mission.yaml")

def load_mission():
    with open(MISSION_FILE, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def main():
    mission = load_mission()

    print("=" * 50)
    print("SCIE Builder v0.1")
    print("=" * 50)
    print(f"Mission : {mission['mission']['goal']}")
    print(f"Phase   : {mission['phase']['name']}")
    print(f"Task    : {mission['task']['current']}")
    print(f"Status  : {mission['status']}")
    print("=" * 50)

if __name__ == "__main__":
    main()
