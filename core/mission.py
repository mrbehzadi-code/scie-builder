import yaml

def load_mission():

    with open("mission.yaml","r",encoding="utf-8") as f:
        return yaml.safe_load(f)
