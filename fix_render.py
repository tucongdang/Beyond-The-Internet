with open("src/components/AdminPortal.tsx", "r") as f:
    content = f.read()

target = """      ) : activeAdminTab === 'SNAPSHOTS' ? (
        <div className="space-y-6">
          <BroadcastSnapshotHistoryTab
            gameState={gameState}
            responses={currentResponses}
            allResponses={allResponses}
            activeCount={activeCount}
            onTriggerSnap={handleSnapAudienceInteraction}
            isSnapping={isSnapping}
          />
        </div>
      ) : ("""

replacement = """      ) : activeAdminTab === 'SNAPSHOTS' ? (
        <div className="space-y-6">
          <BroadcastSnapshotHistoryTab
            gameState={gameState}
            responses={currentResponses}
            allResponses={allResponses}
            activeCount={activeCount}
            onTriggerSnap={handleSnapAudienceInteraction}
            isSnapping={isSnapping}
          />
        </div>
      ) : activeAdminTab === 'GUIDE' ? (
        <div className="space-y-6">
          <AdminGuide />
        </div>
      ) : ("""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/AdminPortal.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found!")
