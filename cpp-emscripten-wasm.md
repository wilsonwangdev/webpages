# 让Wasm模块调用JavaScript函数

要让WebAssembly模块能够调用JavaScript提供的函数，需要通过**导入(imports)**机制来实现。这允许你在JavaScript中定义函数，然后在Wasm模块中调用它们。

## 基本实现方法

### 1. 在C/C++中声明外部函数

首先在C/C++代码中使用`extern`声明要调用的JavaScript函数：

```c
// main.c

// 声明外部函数（由JavaScript提供）
extern void js_console_log(const char* msg);
extern int js_add_numbers(int a, int b);

// 可以从Wasm调用的函数
void print_message() {
    js_console_log("Hello from WebAssembly!");
}

int calculate_sum(int x, int y) {
    return js_add_numbers(x, y);  // 调用JavaScript函数
}
```

### 2. 编译时指定导出函数

使用Emscripten编译时，确保导出需要的函数：

```bash
emcc main.c -o main.js -s EXPORTED_FUNCTIONS='["_print_message", "_calculate_sum"]' -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]'
```

## 提供JavaScript导入函数

### 方法一：使用Emscripten的`Module`对象

```html
<script>
var Module = {
    // 在模块初始化前定义导入对象
    onRuntimeInitialized: function() {
        console.log("Wasm模块加载完成");
    },
    
    // 定义Wasm模块需要导入的函数
    print: function(text) {
        console.log("Wasm says:", UTF8ToString(text));
    }
};

// 加载Emscripten生成的脚本
</script>
<script src="main.js"></script>
```

### 方法二：手动实例化时的导入对象

如果直接使用WebAssembly API，需要在实例化时提供导入对象：

```javascript
// 定义导入对象
const importObject = {
    env: {
        // 内存管理函数
        memoryBase: 0,
        tableBase: 0,
        memory: new WebAssembly.Memory({ initial: 256 }),
        table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' }),
        
        // 自定义导入函数
        js_console_log: function(pointer) {
            const memory = new Uint8Array(importObject.env.memory.buffer);
            let string = '';
            let i = pointer;
            while (memory[i] != 0) {
                string += String.fromCharCode(memory[i]);
                i++;
            }
            console.log("Wasm输出:", string);
        },
        
        js_add_numbers: function(a, b) {
            return a + b;
        }
    }
};

// 实例化Wasm模块
WebAssembly.instantiateStreaming(fetch('main.wasm'), importObject)
    .then(obj => {
        const exports = obj.instance.exports;
        exports._print_message();  // 调用Wasm函数
        const result = exports._calculate_sum(5, 3);
        console.log("计算结果:", result);
    });
```

## 使用Emscripten的完整示例

### C++代码
```cpp
// main.cpp
#include <emscripten.h>
#include <string>

// 声明由JavaScript实现的函数
extern "C" {
    // JavaScript提供的函数
    extern void js_alert(const char* message);
    extern int js_random_int(int min, int max);
    extern void js_dom_append(const char* element, const char* text);
    
    // 导出给JavaScript调用的函数
    EMSCRIPTEN_KEEPALIVE void run_demo() {
        // 调用JavaScript的alert
        js_alert("这是从WebAssembly调用的alert!");
        
        // 调用JavaScript的随机数生成器
        int random_num = js_random_int(1, 100);
        
        // 构建消息
        std::string msg = "随机数是: " + std::to_string(random_num);
        js_dom_append("p", msg.c_str());
        
        // 在控制台输出（通过JavaScript）
        js_dom_append("p", "WebAssembly演示完成!");
    }
    
    EMSCRIPTEN_KEEPALIVE int process_with_js(int input) {
        // 使用JavaScript函数处理数据
        return js_random_int(input, input * 2);
    }
}
```

### HTML和JavaScript
```html
<!DOCTYPE html>
<html>
<head>
    <title>Wasm-JS交互演示</title>
</head>
<body>
    <div id="output"></div>
    
    <script>
        var Module = {
            onRuntimeInitialized: function() {
                console.log("WebAssembly模块已就绪");
                
                // 调用Wasm函数
                Module._run_demo();
                
                // 处理数据
                const result = Module._process_with_js(10);
                console.log("处理结果:", result);
            },
            
            // 提供给Wasm的导入函数
            js_alert: function(messagePtr) {
                const message = UTF8ToString(messagePtr);
                alert(message);
            },
            
            js_random_int: function(min, max) {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            },
            
            js_dom_append: function(elementPtr, textPtr) {
                const elementType = UTF8ToString(elementPtr);
                const text = UTF8ToString(textPtr);
                
                const element = document.createElement(elementType);
                element.textContent = text;
                document.getElementById('output').appendChild(element);
            }
        };
    </script>
    <script src="main.js"></script>
</body>
</html>
```

### 编译命令
```bash
emcc main.cpp -o main.js -s EXPORTED_FUNCTIONS='["_run_demo", "_process_with_js"]' -s EXPORTED_RUNTIME_METHODS='["UTF8ToString", "ccall", "cwrap"]'
```

## 高级用法：内存共享和回调

### 共享内存操作
```cpp
// memory_demo.cpp
#include <emscripten.h>
#include <cstring>

extern "C" {
    EMSCRIPTEN_KEEPALIVE void fill_buffer(char* buffer, int size) {
        // 直接操作由JavaScript提供的缓冲区
        for (int i = 0; i < size; i++) {
            buffer[i] = 'A' + (i % 26);
        }
    }
    
    EMSCRIPTEN_KEEPALIVE int process_buffer(char* input, char* output, int length) {
        // 处理数据并返回结果
        int sum = 0;
        for (int i = 0; i < length; i++) {
            output[i] = input[i] + 1;  // 简单的变换
            sum += input[i];
        }
        return sum;
    }
}
```

### JavaScript端的内存管理
```javascript
// 在JavaScript中分配内存并与Wasm共享
const bufferSize = 100;
const inputPointer = Module._malloc(bufferSize);
const outputPointer = Module._malloc(bufferSize);

// 填充输入数据
const input = new Uint8Array(Module.HEAPU8.buffer, inputPointer, bufferSize);
for (let i = 0; i < bufferSize; i++) {
    input[i] = i;
}

// 调用Wasm处理函数
const result = Module._process_buffer(inputPointer, outputPointer, bufferSize);

// 读取输出
const output = new Uint8Array(Module.HEAPU8.buffer, outputPointer, bufferSize);
console.log("处理结果:", output);

// 清理内存
Module._free(inputPointer);
Module._free(outputPointer);
```

## 处理复杂数据类型

### 字符串传递
```cpp
// string_demo.cpp
#include <emscripten.h>
#include <string>

extern "C" {
    // JavaScript提供的字符串处理函数
    extern int js_string_length(const char* str);
    extern void js_reverse_string(const char* input, char* output);
    
    EMSCRIPTEN_KEEPALIVE void string_operations() {
        const char* test_string = "Hello WebAssembly";
        
        // 调用JavaScript函数处理字符串
        int len = js_string_length(test_string);
        
        // 分配内存用于输出
        char* reversed = (char*)malloc(len + 1);
        js_reverse_string(test_string, reversed);
        
        // 使用结果...
        free(reversed);
    }
}
```

```javascript
// JavaScript实现
Module.js_string_length = function(strPtr) {
    const str = UTF8ToString(strPtr);
    return str.length;
};

Module.js_reverse_string = function(inputPtr, outputPtr) {
    const input = UTF8ToString(inputPtr);
    const reversed = input.split('').reverse().join('');
    
    // 将结果写回Wasm内存
    stringToUTF8(reversed, outputPtr, 1024);
};
```

## 编译选项说明

```bash
# 完整的编译命令示例
emcc main.cpp \
  -o main.js \
  -s EXPORTED_FUNCTIONS='["_main","_my_function"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","stringToUTF8"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1
```

**关键选项：**
- `EXPORTED_FUNCTIONS`: 指定要导出的C/C++函数
- `EXPORTED_RUNTIME_METHODS`: 导出Emscripten运行时辅助函数
- `ALLOW_MEMORY_GROWTH`: 允许内存动态增长
- `MODULARIZE`和`EXPORT_ES6`: 生成模块化代码

通过这种方式，你可以在Wasm和JavaScript之间建立双向通信，充分利用两种环境的优势：Wasm处理高性能计算，JavaScript处理DOM操作和浏览器API调用。