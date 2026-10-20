# Simulation reference

Read this before you simulate. Use it only when you can run code and the team gave a low, likely, and high value for each driver. If you cannot run code, report the scenario range and give no percentile.

## Contents

- What the script does
- The script
- How to adapt it
- How to report the result

## What the script does

1. Each driver gets a triangular distribution from its low, likely, and high values.
2. One shared "trouble" draw ties the drivers together. The correlation `rho` sets how strongly. At `rho = 0` the drivers are independent. At `rho` near 1 they all run bad together.
3. The script draws 20,000 totals and prints P50, P80, and P90.

The script uses the Python 3 standard library only. It makes no network call and writes no file.

## The script

Edit the `DRIVERS` and `FIXED` blocks and the `total_hours` function to match the cycle. The values below are the worked example.

```python
import math, random

def tri_inv(u, lo, mode, hi):
    # inverse CDF of a triangular distribution
    if hi == lo:
        return lo
    fc = (mode - lo) / (hi - lo)
    if u < fc:
        return lo + math.sqrt(u * (hi - lo) * (mode - lo))
    return hi - math.sqrt((1 - u) * (hi - lo) * (hi - mode))

def phi(x):
    # standard normal CDF
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))

# Team-supplied drivers as (low, likely, high).
DRIVERS = {
    "new_cases_per_req": (3, 4, 7),
    "design_min":        (20, 25, 35),
    "manual_min":        (15, 18, 22),
    "fail_rate":         (0.05, 0.09, 0.15),
    "triage_min":        (15, 20, 30),
}
# Platform counts and fixed team inputs.
FIXED = {"uncovered_reqs": 8, "existing_manual": 118,
         "auto_results": 96 * 3, "overhead": 0.15}

def total_hours(x):
    new_cases = FIXED["uncovered_reqs"] * x["new_cases_per_req"]
    a = new_cases * x["design_min"] / 60
    b = (FIXED["existing_manual"] + new_cases) * x["manual_min"] / 60
    c = FIXED["auto_results"] * x["fail_rate"] * x["triage_min"] / 60
    return (a + b + c) * (1 + FIXED["overhead"])

def simulate(rho, n=20000, seed=7):
    rng = random.Random(seed)
    totals = []
    for _ in range(n):
        z = rng.gauss(0, 1)                       # shared trouble factor
        x = {}
        for name, (lo, mode, hi) in DRIVERS.items():
            e = rng.gauss(0, 1)                   # driver-specific noise
            u = phi(rho * z + math.sqrt(1 - rho * rho) * e)
            x[name] = tri_inv(u, lo, mode, hi)
        totals.append(total_hours(x))
    totals.sort()
    q = lambda p: totals[int(p * (len(totals) - 1))]
    return q(0.5), q(0.8), q(0.9)

# Scenario totals.
for label, i in (("best", 0), ("likely", 1), ("worst", 2)):
    print(label, round(total_hours({k: v[i] for k, v in DRIVERS.items()}), 1))

# Percentiles at three correlation values.
for rho in (0.0, 0.6, 0.9):
    print("rho", rho, "P50/P80/P90", [round(v, 1) for v in simulate(rho)])
```

Expected output for the worked example: best 54.2, likely 77.0, worst 135.8. Then P50/P80/P90 of 84.8/92.2/96.2 at `rho` 0.0, 84.6/95.7/101.7 at 0.6, and 84.0/99.3/107.9 at 0.9. If your numbers differ, check the edits before you report anything.

## How to adapt it

- **Different buckets.** Change `total_hours`. Keep the driver draws as they are.
- **Automation authoring in scope.** Add a driver for hours per case and a fixed count of cases to automate. Add them to the total before overhead.
- **Several manual configurations.** Multiply the manual case count by the number of manual configurations inside `total_hours`.
- **A driver with no range.** Give it the same value three times. It then stays fixed. Name it as an assumption in the output.

## How to report the result

- Say "model P80". Name the correlation you assumed. Print all three correlation rows, or the lowest and highest P80.
- Say that the percentiles reflect the driver ranges the team supplied. They are not measured probabilities.
- Compare P50 with the Likely case. P50 usually sits higher when the high values are further from the likely values than the low values are. Tell the reader so.
- Use P50 and P80 for headcount and dates. Do not use the Best case for any commitment.
- Do not report a P80 you did not run. Without code, give Likely and Worst case and say the range is scenario-based.
