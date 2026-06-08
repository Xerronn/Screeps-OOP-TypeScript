1. fix remote bug where containers are not getting created
3. arbiter not spawning automatically
4. make the host and arbiter spots definite no go
5. energy usage priorities (maybe dont even spawn those creeps when room priority isnt right)
6. pathing priorities for creeps
7. make gamestages less rigid around rcl so that if rcls get completed too quickly it does things correctly still
8. creepqueue directives can be simplified
9. should directives be moved to room memory?
10. rewrite links so that the miner links can send to upgrader links without passing through main link every time
11. REWRITE ARBITER
- have some sort of object make sure if a building is destroyed it gets replaced
- store more of room planning in memory
- instead of storing sensitive ids that can change in creep memory store it in the schematic or something and have the creep look it up so we can easily change the source of truth if the id changes