from pathlib import Path

OUTPUT=Path("outputs/discovery.txt")

def discover():

    people=[
        "Professor Ali Rezaei",
        "Dr. Sara Hosseini",
        "Engineer Mohammad Karimi",
        "Researcher Zahra Ahmadi"
    ]

    OUTPUT.parent.mkdir(exist_ok=True)

    with open(OUTPUT,"w",encoding="utf-8") as f:

        for p in people:

            f.write(p+"\n")

    print()

    print("Discovery Engine")

    print("----------------")

    print(f"{len(people)} candidates discovered")

    print()

    print("Saved ->",OUTPUT)
