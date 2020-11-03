module.exports = {
    steamapiskey: "bmyRVmF1HOQ9IH5LmSInrD8FgV4",
    delitelSteam: 1.1,
    delitelTM: 1.1,
    timeoutCount: 10000,
    delitelPrice2: 1.2,
    steamKey: 'FM3U7yYbHgbko6S8gI4IV7ge1nP4fg7',
    filterDayCount: 7,
    minItemsCount: 7,
    DividerAverageForPrice3: [
        { from: 0.01, to: 10, divider: 1.45 },
        { from: 10.01, to: 5000000, divider: 1.45 },
        
    ],
    dividerSteamForPrice3: [
        { from: 0.00001, to: 5000000, divider: 1.45 }
    ],
    steamMultiplierMax: 1.5,
    steamMultiplierMin: 0.5,
    dividerForNotAtFilter: [
        { from: 0.00001, to: 5000000, divider: 2 }
    ],
    dividerSteamForPrice4: [
        { from: 0.00001, to: 5500000, divider: 2 }
    ],
    restartAfter: 1000
}