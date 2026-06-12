to build the wasm files you need cmake>=4.3 and emsdk

clangd is good for dev too

```
emcmake cmake -S . -B build -DPLATFORM=Web -DCMAKE_EXPORT_COMPILE_COMMANDS=1
cmake --build build
ln -s build/clangd .clangd
```