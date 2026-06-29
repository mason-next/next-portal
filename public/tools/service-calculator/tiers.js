// tiers.js

// --- Tier 1 (Silver) ---
const rowsTier1 = [
  { systemCost: 4000, tickets: 1, totalServiceCost: 526.06, costPct: 0.132, systemPrice: 5000, pricePct: 0.12, totalServicePrice: 600, gp: 73.94, gm: 0.123 },
  { systemCost: 5000, tickets: 1, totalServiceCost: 526.06, costPct: 0.105, systemPrice: 6250, pricePct: 0.10, totalServicePrice: 625, gp: 98.94, gm: 0.158 },
  { systemCost: 7500, tickets: 1, totalServiceCost: 526.06, costPct: 0.070, systemPrice: 9375, pricePct: 0.08, totalServicePrice: 750, gp: 223.94, gm: 0.299 },
  { systemCost: 10000, tickets: 2, totalServiceCost: 689.98, costPct: 0.069, systemPrice: 12500, pricePct: 0.08, totalServicePrice: 1000, gp: 310.02, gm: 0.31 },
  { systemCost: 12500, tickets: 2, totalServiceCost: 689.98, costPct: 0.055, systemPrice: 15625, pricePct: 0.07, totalServicePrice: 1093.75, gp: 403.77, gm: 0.369 },
  { systemCost: 15000, tickets: 2, totalServiceCost: 689.98, costPct: 0.046, systemPrice: 18750, pricePct: 0.06, totalServicePrice: 1125, gp: 435.02, gm: 0.387 },
  { systemCost: 17500, tickets: 2, totalServiceCost: 689.98, costPct: 0.039, systemPrice: 21875, pricePct: 0.06, totalServicePrice: 1312.5, gp: 622.52, gm: 0.474 },
  { systemCost: 20000, tickets: 3, totalServiceCost: 853.91, costPct: 0.043, systemPrice: 25000, pricePct: 0.06, totalServicePrice: 1500, gp: 646.09, gm: 0.431 },
  { systemCost: 25000, tickets: 3, totalServiceCost: 853.91, costPct: 0.034, systemPrice: 31250, pricePct: 0.05, totalServicePrice: 1562.5, gp: 708.59, gm: 0.453 },
  { systemCost: 30000, tickets: 3, totalServiceCost: 853.91, costPct: 0.028, systemPrice: 37500, pricePct: 0.05, totalServicePrice: 1875, gp: 1021.09, gm: 0.545 },
  { systemCost: 40000, tickets: 4, totalServiceCost: 1017.84, costPct: 0.025, systemPrice: 50000, pricePct: 0.05, totalServicePrice: 2500, gp: 1482.16, gm: 0.593 },
  { systemCost: 50000, tickets: 4, totalServiceCost: 1017.84, costPct: 0.020, systemPrice: 62500, pricePct: 0.05, totalServicePrice: 3125, gp: 2107.16, gm: 0.674 },
  { systemCost: 60000, tickets: 5, totalServiceCost: 1181.76, costPct: 0.020, systemPrice: 75000, pricePct: 0.05, totalServicePrice: 3750, gp: 2568.24, gm: 0.685 },
  { systemCost: 75000, tickets: 5, totalServiceCost: 1181.76, costPct: 0.016, systemPrice: 93750, pricePct: 0.05, totalServicePrice: 4687.5, gp: 3505.74, gm: 0.748 },
  { systemCost: 90000, tickets: 6, totalServiceCost: 1345.69, costPct: 0.015, systemPrice: 112500, pricePct: 0.05, totalServicePrice: 5625, gp: 4279.31, gm: 0.761 },
  { systemCost: 100000, tickets: 6, totalServiceCost: 1345.69, costPct: 0.013, systemPrice: 125000, pricePct: 0.05, totalServicePrice: 6250, gp: 4904.31, gm: 0.785 },
  { systemCost: 125000, tickets: 7, totalServiceCost: 1509.61, costPct: 0.012, systemPrice: 156250, pricePct: 0.05, totalServicePrice: 7812.5, gp: 6302.89, gm: 0.807 },
  { systemCost: 150000, tickets: 7, totalServiceCost: 1509.61, costPct: 0.010, systemPrice: 187500, pricePct: 0.05, totalServicePrice: 9375, gp: 7865.39, gm: 0.839 },
  { systemCost: 175000, tickets: 8, totalServiceCost: 1673.54, costPct: 0.010, systemPrice: 218750, pricePct: 0.05, totalServicePrice: 10937.5, gp: 9263.96, gm: 0.847 },
  { systemCost: 200000, tickets: 9, totalServiceCost: 1837.46, costPct: 0.009, systemPrice: 250000, pricePct: 0.05, totalServicePrice: 12500, gp: 10662.54, gm: 0.853 },
  { systemCost: 225000, tickets: 9, totalServiceCost: 1837.46, costPct: 0.008, systemPrice: 281250, pricePct: 0.05, totalServicePrice: 14062.5, gp: 12225.04, gm: 0.869 },
  { systemCost: 250000, tickets: 10, totalServiceCost: 2001.39, costPct: 0.008, systemPrice: 312500, pricePct: 0.05, totalServicePrice: 15625, gp: 13623.61, gm: 0.872 },
  { systemCost: 275000, tickets: 10, totalServiceCost: 2001.39, costPct: 0.007, systemPrice: 343750, pricePct: 0.05, totalServicePrice: 17187.5, gp: 15186.11, gm: 0.884 },
  { systemCost: 300000, tickets: 11, totalServiceCost: 2165.31, costPct: 0.007, systemPrice: 375000, pricePct: 0.05, totalServicePrice: 18750, gp: 16584.69, gm: 0.885 },
  { systemCost: 325000, tickets: 12, totalServiceCost: 2329.24, costPct: 0.007, systemPrice: 406250, pricePct: 0.05, totalServicePrice: 20312.5, gp: 17983.26, gm: 0.885 },
  { systemCost: 350000, tickets: 12, totalServiceCost: 2329.24, costPct: 0.007, systemPrice: 437500, pricePct: 0.05, totalServicePrice: 21875, gp: 19545.76, gm: 0.894 },
  { systemCost: 375000, tickets: 13, totalServiceCost: 2493.16, costPct: 0.007, systemPrice: 468750, pricePct: 0.05, totalServicePrice: 23437.5, gp: 20944.34, gm: 0.894 },
  { systemCost: 400000, tickets: 14, totalServiceCost: 2657.09, costPct: 0.007, systemPrice: 500000, pricePct: 0.05, totalServicePrice: 25000, gp: 22342.91, gm: 0.894 },
  { systemCost: 500000, tickets: 15, totalServiceCost: 2821.02, costPct: 0.006, systemPrice: 625000, pricePct: 0.045, totalServicePrice: 28125, gp: 25303.98, gm: 0.90 },
  { systemCost: 600000, tickets: 16, totalServiceCost: 2984.94, costPct: 0.005, systemPrice: 750000, pricePct: 0.04, totalServicePrice: 30000, gp: 27015.06, gm: 0.901 },
  { systemCost: 700000, tickets: 17, totalServiceCost: 3148.87, costPct: 0.004, systemPrice: 875000, pricePct: 0.04, totalServicePrice: 35000, gp: 31851.13, gm: 0.91 },
  { systemCost: 800000, tickets: 18, totalServiceCost: 3312.79, costPct: 0.004, systemPrice: 1000000, pricePct: 0.04, totalServicePrice: 40000, gp: 36687.21, gm: 0.917 }
];


// --- Tier 2 (Gold) ---
const rowsTier2 = [
  { systemCost: 4000, tickets: 2, totalServiceCost: 779.02, costPct: 0.195, systemPrice: 5000, pricePct: 0.18, totalServicePrice: 900, gp: 120.98, gm: 0.134 },
  { systemCost: 5000, tickets: 2, totalServiceCost: 779.02, costPct: 0.156, systemPrice: 6250, pricePct: 0.16, totalServicePrice: 1000, gp: 220.98, gm: 0.221 },
  { systemCost: 7500, tickets: 2, totalServiceCost: 779.02, costPct: 0.104, systemPrice: 9375, pricePct: 0.12, totalServicePrice: 1125, gp: 345.98, gm: 0.308 },
  { systemCost: 10000, tickets: 3, totalServiceCost: 1031.98, costPct: 0.103, systemPrice: 12500, pricePct: 0.12, totalServicePrice: 1500, gp: 468.02, gm: 0.312 },
  { systemCost: 12500, tickets: 3, totalServiceCost: 1031.98, costPct: 0.083, systemPrice: 15625, pricePct: 0.10, totalServicePrice: 1562.5, gp: 530.52, gm: 0.34 },
  { systemCost: 15000, tickets: 3, totalServiceCost: 1031.98, costPct: 0.069, systemPrice: 18750, pricePct: 0.09, totalServicePrice: 1687.5, gp: 655.52, gm: 0.388 },
  { systemCost: 17500, tickets: 3, totalServiceCost: 1031.98, costPct: 0.059, systemPrice: 21875, pricePct: 0.09, totalServicePrice: 1968.75, gp: 936.77, gm: 0.476 },
  { systemCost: 20000, tickets: 5, totalServiceCost: 1448.87, costPct: 0.072, systemPrice: 25000, pricePct: 0.09, totalServicePrice: 2250, gp: 801.13, gm: 0.356 },
  { systemCost: 25000, tickets: 5, totalServiceCost: 1448.87, costPct: 0.058, systemPrice: 31250, pricePct: 0.08, totalServicePrice: 2500, gp: 1051.13, gm: 0.42 },
  { systemCost: 30000, tickets: 5, totalServiceCost: 1448.87, costPct: 0.048, systemPrice: 37500, pricePct: 0.07, totalServicePrice: 2625, gp: 1176.13, gm: 0.448 },
  { systemCost: 40000, tickets: 6, totalServiceCost: 1612.8, costPct: 0.04, systemPrice: 50000, pricePct: 0.07, totalServicePrice: 3500, gp: 1887.2, gm: 0.539 },
  { systemCost: 50000, tickets: 6, totalServiceCost: 1612.8, costPct: 0.032, systemPrice: 62500, pricePct: 0.07, totalServicePrice: 4375, gp: 2762.2, gm: 0.631 },
  { systemCost: 60000, tickets: 8, totalServiceCost: 2029.69, costPct: 0.034, systemPrice: 75000, pricePct: 0.07, totalServicePrice: 5250, gp: 3220.31, gm: 0.613 },
  { systemCost: 75000, tickets: 8, totalServiceCost: 2029.69, costPct: 0.027, systemPrice: 93750, pricePct: 0.07, totalServicePrice: 6562.5, gp: 4532.81, gm: 0.691 },
  { systemCost: 90000, tickets: 9, totalServiceCost: 2282.65, costPct: 0.025, systemPrice: 112500, pricePct: 0.07, totalServicePrice: 7875, gp: 5592.35, gm: 0.71 },
  { systemCost: 100000, tickets: 9, totalServiceCost: 2282.65, costPct: 0.023, systemPrice: 125000, pricePct: 0.07, totalServicePrice: 8750, gp: 6467.35, gm: 0.739 },
  { systemCost: 125000, tickets: 11, totalServiceCost: 2699.54, costPct: 0.022, systemPrice: 156250, pricePct: 0.07, totalServicePrice: 10937.5, gp: 8237.96, gm: 0.753 },
  { systemCost: 150000, tickets: 11, totalServiceCost: 2699.54, costPct: 0.018, systemPrice: 187500, pricePct: 0.07, totalServicePrice: 13125, gp: 10425.46, gm: 0.794 },
  { systemCost: 175000, tickets: 12, totalServiceCost: 2863.46, costPct: 0.016, systemPrice: 218750, pricePct: 0.07, totalServicePrice: 15312.5, gp: 12449.04, gm: 0.813 },
  { systemCost: 200000, tickets: 14, totalServiceCost: 3280.35, costPct: 0.016, systemPrice: 250000, pricePct: 0.07, totalServicePrice: 17500, gp: 14219.65, gm: 0.813 },
  { systemCost: 225000, tickets: 14, totalServiceCost: 3280.35, costPct: 0.015, systemPrice: 281250, pricePct: 0.07, totalServicePrice: 19687.5, gp: 16407.15, gm: 0.833 },
  { systemCost: 250000, tickets: 15, totalServiceCost: 3533.31, costPct: 0.014, systemPrice: 312500, pricePct: 0.07, totalServicePrice: 21875, gp: 18341.69, gm: 0.838 },
  { systemCost: 275000, tickets: 15, totalServiceCost: 3533.31, costPct: 0.013, systemPrice: 343750, pricePct: 0.07, totalServicePrice: 24062.5, gp: 20529.19, gm: 0.853 },
  { systemCost: 300000, tickets: 17, totalServiceCost: 3950.2, costPct: 0.013, systemPrice: 375000, pricePct: 0.07, totalServicePrice: 26250, gp: 22299.8, gm: 0.85 },
  { systemCost: 325000, tickets: 18, totalServiceCost: 4114.13, costPct: 0.013, systemPrice: 406250, pricePct: 0.07, totalServicePrice: 28437.5, gp: 24323.37, gm: 0.855 },
  { systemCost: 350000, tickets: 18, totalServiceCost: 4114.13, costPct: 0.012, systemPrice: 437500, pricePct: 0.07, totalServicePrice: 30625, gp: 26510.87, gm: 0.866 },
  { systemCost: 375000, tickets: 20, totalServiceCost: 4531.02, costPct: 0.012, systemPrice: 468750, pricePct: 0.07, totalServicePrice: 32812.5, gp: 28281.48, gm: 0.862 },
  { systemCost: 400000, tickets: 21, totalServiceCost: 4783.98, costPct: 0.012, systemPrice: 500000, pricePct: 0.07, totalServicePrice: 35000, gp: 30216.02, gm: 0.863 },
  { systemCost: 500000, tickets: 23, totalServiceCost: 5200.87, costPct: 0.01, systemPrice: 625000, pricePct: 0.065, totalServicePrice: 40625, gp: 35424.13, gm: 0.872 },
  { systemCost: 600000, tickets: 24, totalServiceCost: 5364.79, costPct: 0.009, systemPrice: 750000, pricePct: 0.06, totalServicePrice: 45000, gp: 39635.21, gm: 0.881 },
  { systemCost: 700000, tickets: 26, totalServiceCost: 5781.68, costPct: 0.008, systemPrice: 875000, pricePct: 0.06, totalServicePrice: 52500, gp: 46718.32, gm: 0.89 },
  { systemCost: 800000, tickets: 27, totalServiceCost: 6034.64, costPct: 0.008, systemPrice: 1000000, pricePct: 0.06, totalServicePrice: 60000, gp: 53965.36, gm: 0.899 }
];


// --- Tier 3 (Platinum) ---
const rowsTier3 = [
  { systemCost: 10000, tickets: 4, totalServiceCost: 4253.98, costPct: 0.425, systemPrice: 12500, pricePct: 0.57, totalServicePrice: 7125, gp: 2871.02, gm: 0.403 },
  { systemCost: 12500, tickets: 4, totalServiceCost: 4253.98, costPct: 0.34, systemPrice: 15625, pricePct: 0.47, totalServicePrice: 7343.75, gp: 3089.77, gm: 0.421 },
  { systemCost: 15000, tickets: 4, totalServiceCost: 4253.98, costPct: 0.284, systemPrice: 18750, pricePct: 0.40, totalServicePrice: 7500, gp: 3246.02, gm: 0.433 },
  { systemCost: 17500, tickets: 4, totalServiceCost: 4253.98, costPct: 0.243, systemPrice: 21875, pricePct: 0.36, totalServicePrice: 7875, gp: 3621.02, gm: 0.46 },
  { systemCost: 20000, tickets: 6, totalServiceCost: 4759.91, costPct: 0.238, systemPrice: 25000, pricePct: 0.32, totalServicePrice: 8000, gp: 3240.09, gm: 0.405 },
  { systemCost: 25000, tickets: 6, totalServiceCost: 4759.91, costPct: 0.19, systemPrice: 31250, pricePct: 0.26, totalServicePrice: 8125, gp: 3365.09, gm: 0.414 },
  { systemCost: 30000, tickets: 6, totalServiceCost: 4759.91, costPct: 0.159, systemPrice: 37500, pricePct: 0.22, totalServicePrice: 8250, gp: 3490.09, gm: 0.423 },
  { systemCost: 40000, tickets: 8, totalServiceCost: 5265.84, costPct: 0.132, systemPrice: 50000, pricePct: 0.17, totalServicePrice: 8500, gp: 3234.16, gm: 0.38 },
  { systemCost: 50000, tickets: 8, totalServiceCost: 5265.84, costPct: 0.105, systemPrice: 62500, pricePct: 0.14, totalServicePrice: 8750, gp: 3484.16, gm: 0.398 },
  { systemCost: 60000, tickets: 10, totalServiceCost: 5771.76, costPct: 0.096, systemPrice: 75000, pricePct: 0.12, totalServicePrice: 9000, gp: 3228.24, gm: 0.359 },
  { systemCost: 75000, tickets: 10, totalServiceCost: 5771.76, costPct: 0.077, systemPrice: 93750, pricePct: 0.10, totalServicePrice: 9375, gp: 3603.24, gm: 0.384 },
  { systemCost: 90000, tickets: 12, totalServiceCost: 6277.69, costPct: 0.07, systemPrice: 112500, pricePct: 0.09, totalServicePrice: 10125, gp: 3847.31, gm: 0.38 },
  { systemCost: 100000, tickets: 12, totalServiceCost: 6277.69, costPct: 0.063, systemPrice: 125000, pricePct: 0.09, totalServicePrice: 11250, gp: 4972.31, gm: 0.442 },
  { systemCost: 125000, tickets: 14, totalServiceCost: 6783.61, costPct: 0.054, systemPrice: 156250, pricePct: 0.09, totalServicePrice: 14062.5, gp: 7278.89, gm: 0.518 },
  { systemCost: 150000, tickets: 14, totalServiceCost: 6783.61, costPct: 0.045, systemPrice: 187500, pricePct: 0.09, totalServicePrice: 16875, gp: 10091.39, gm: 0.598 },
  { systemCost: 175000, tickets: 16, totalServiceCost: 7289.54, costPct: 0.042, systemPrice: 218750, pricePct: 0.09, totalServicePrice: 19687.5, gp: 12397.96, gm: 0.63 },
  { systemCost: 200000, tickets: 18, totalServiceCost: 7795.46, costPct: 0.039, systemPrice: 250000, pricePct: 0.09, totalServicePrice: 22500, gp: 14704.54, gm: 0.654 },
  { systemCost: 225000, tickets: 18, totalServiceCost: 7795.46, costPct: 0.035, systemPrice: 281250, pricePct: 0.09, totalServicePrice: 25312.5, gp: 17517.04, gm: 0.692 },
  { systemCost: 250000, tickets: 20, totalServiceCost: 8301.39, costPct: 0.033, systemPrice: 312500, pricePct: 0.09, totalServicePrice: 28125, gp: 19823.61, gm: 0.705 },
  { systemCost: 275000, tickets: 20, totalServiceCost: 8301.39, costPct: 0.03, systemPrice: 343750, pricePct: 0.09, totalServicePrice: 30937.5, gp: 22636.11, gm: 0.732 },
  { systemCost: 300000, tickets: 22, totalServiceCost: 8807.31, costPct: 0.029, systemPrice: 375000, pricePct: 0.09, totalServicePrice: 33750, gp: 24942.69, gm: 0.739 },
  { systemCost: 325000, tickets: 24, totalServiceCost: 9313.24, costPct: 0.029, systemPrice: 406250, pricePct: 0.09, totalServicePrice: 36562.5, gp: 27249.26, gm: 0.745 },
  { systemCost: 350000, tickets: 24, totalServiceCost: 9313.24, costPct: 0.027, systemPrice: 437500, pricePct: 0.09, totalServicePrice: 39375, gp: 30061.76, gm: 0.763 },
  { systemCost: 375000, tickets: 26, totalServiceCost: 9819.16, costPct: 0.026, systemPrice: 468750, pricePct: 0.09, totalServicePrice: 42187.5, gp: 32368.34, gm: 0.767 },
  { systemCost: 400000, tickets: 28, totalServiceCost: 10325.09, costPct: 0.026, systemPrice: 500000, pricePct: 0.09, totalServicePrice: 45000, gp: 34674.91, gm: 0.771 },
  { systemCost: 500000, tickets: 30, totalServiceCost: 10831.02, costPct: 0.022, systemPrice: 625000, pricePct: 0.09, totalServicePrice: 56250, gp: 45418.98, gm: 0.807 },
  { systemCost: 600000, tickets: 32, totalServiceCost: 11336.94, costPct: 0.019, systemPrice: 750000, pricePct: 0.09, totalServicePrice: 67500, gp: 56163.06, gm: 0.832 },
  { systemCost: 700000, tickets: 34, totalServiceCost: 11842.87, costPct: 0.017, systemPrice: 875000, pricePct: 0.09, totalServicePrice: 78750, gp: 66907.13, gm: 0.85 },
  { systemCost: 800000, tickets: 36, totalServiceCost: 12348.79, costPct: 0.015, systemPrice: 1000000, pricePct: 0.09, totalServicePrice: 90000, gp: 77651.21, gm: 0.863 }
];

// Expose one object the main script can use
window.tierData = {
  tier1: rowsTier1,
  tier2: rowsTier2,
  tier3: rowsTier3
};
