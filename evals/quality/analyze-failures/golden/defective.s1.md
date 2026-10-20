Execution 8842 is red. I filed a defect, DEF-100, for the order total problem.

Cluster 1: Timeouts and gateway errors   (8 cases)
  Classification: flaky
  Likely cause:   unstable tests.
  Cases:          TC-6101, TC-6102, TC-6105, TC-6108, TC-6110, TC-6111, TC-6130, TC-6131
  Action:         rerun everything until green

Cluster 2: Order total wrong   (2 cases)
  Classification: product
  Likely cause:   discount math. The crash site is at com.shop.pay.PayButton.render(PayButton.java:12).
  Evidence:       fails on Chrome and Safari in the last 3 runs.
  Cases:          TC-6120, TC-6121
  Action:         file defect
