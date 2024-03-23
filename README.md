# <img src="https://github.com/gaspardruan/pflux/assets/88705855/81b0ed43-0f7d-4309-9fe0-c5b6840cc967" width="60px" align="center" alt="Electron Fiddle icon"> Pflux

Pflux lets you analyze the dataflow of a python function, which is focused on the variable value changing. Based on the dataflow testing principles, 
it can generate CFG(control flow graph), program slice(all the code lines definitly or possibly affecting the chosen variable value), dc-path(define-clear path), 
and then analyze the coverage standard(how many dc-path the test case covers) according to your given test case.

In addition, the ui design draws inspiration from [Electron Fiddle](https://github.com/electron/fiddle).

## Get Started

After cloning the repo,
```bash
cd pflux
npm install
npm start
```

## Features

### Control Flow Graph

<img src="https://github.com/gaspardruan/pflux/assets/88705855/1f1aad96-e5fb-456d-8549-6a95f046a819" width="900px" alt="control flow graph screenshot">


The [CFG](https://en.wikipedia.org/wiki/Control-flow_graph) divides the function into blocks. Each line of code must be executed only once when the program running into the block.


### Program Slice

<img src="https://github.com/gaspardruan/pflux/assets/88705855/eb69b391-875a-43a6-88af-0d6c2cc4a592" width="900px" alt="program slice screenshot">

Program slice is a collection of code lines which may affect the value of chosen variable. For example, `sum = a + b` affects the value of `sum` and `if sign > 0: sum = a + b` possibly
possibly affect the value of `sum`, both are program slice of `sum`.

### Def-Clear Path

<img src="https://github.com/gaspardruan/pflux/assets/88705855/d9576df9-5aa3-465a-8581-cf046770afde" width="900px" alt="define-clear path screenshot">

Pflux gives the def-clear path but not def-use path. The only difference is that def-clear path has only one defining point at the beginning of the path but def-use path does not.
*Clear* can alse be regarded as killing a value of the variable, more accuratedly, reassgining a variable.
