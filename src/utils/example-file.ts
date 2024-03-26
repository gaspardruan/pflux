export const files = {
  'while-if(cfg).py': `def isPositive(limit):
  i=-2
  while i < limit:
    if i > 0:
      print("i is positive")
    elif i < 0:
      print("i is negative")
    else:
      print("i is zero")
    i += 1
    print("i is now " + str(i))
  print("done")
`,
  'for_loop(slice).py': `def test_for(limit):
  x = 0
  y = 0
  for i in range(limit):
    x = x + i
    y = y + i * i
  d = x + y`,
  'if(dc-path).py': `def test_coverage(a, b):
  if b > 1:
    a = a + 7
  if a > 10:
    b = a + b
  print(a, b)`,
  'long_func(cfg_slice).py': `def shop():
  trufflePrice = 12.50
  kobeBeefPrice = 18.75
  saffronPrice = 28.13
  truffleSales = 0.0
  kobeBeefSales = 0.0
  saffronSales = 0.0
  totalSales = 0.0
  totalTruffles = 0
  totalKobeBeefs = 0
  totalSaffrons = 0
  message = ""
  event = ""
  while event != "submit" and event != "quit":

    event = input()
    if event == "remove 1 truffle":
      totalTruffles -= 1
      message = "Removed 1 truffle"
    elif event == "add 1 truffle":
      totalTruffles += 1
      message = "Added 1 truffle"
    elif event == "remove 1 Kobe Beef":
      totalKobeBeefs -= 1
      message = "Removed 1 Kobe Beef"
    elif event == "add 1 Kobe Beef":
      totalKobeBeefs += 1
      message = "Added 1 Kobe Beef"
    elif event == "remove 1 saffron":
      totalSaffrons -= 1
      message = "Removed 1 saffron"
    elif event == "add 1 saffron":
      totalSaffrons += 1
      message = "Added 1 saffron"

    truffleSales = trufflePrice * totalTruffles
    kobeBeefSales = kobeBeefPrice * totalKobeBeefs
    saffronSales = saffronPrice * totalSaffrons
    totalSales = truffleSales + kobeBeefSales + saffronSales
    setMesage(message + " total price: " + totalSales)

  if event == "submit":
    return totalSales
  return 0.0`,
};
