# <img src="https://github.com/gaspardruan/pflux/assets/88705855/81b0ed43-0f7d-4309-9fe0-c5b6840cc967" width="60px" align="center" alt="Electron Fiddle icon"> Pflux

Pflux lets you analyze the dataflow of a python function, which is focused on the variable value changing. Based on the dataflow testing principles, 
it can generate CFG(control flow graph), program slice(all the code lines definitly or possibly affecting the chosen variable value), dc-path(define-clear path), 
and then analyze the coverage standard(how many dc-path the test case covers) according to your given test case.

## Features

