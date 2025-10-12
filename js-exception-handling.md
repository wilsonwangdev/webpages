# JS中如何实现异常处理和性能监控

在 JavaScript（尤其是 Node.js 和前端）项目中，可以通过 **中间件、装饰器、AOP 风格编程、APM 工具** 等方式实现 **异常处理** 和 **性能监控**，保持代码解耦和可维护性。以下是具体实现方案：

---

## **1. 异常处理（Exception Handling）**

### **(1) Express/Koa 全局错误处理中间件**

适用于 Node.js Web 应用（如 Express、Koa），集中处理所有未捕获的异常。  
**示例（Express.js）**：

```javascript
// 自定义错误类
class BusinessError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// 全局错误处理器
app.use((err, req, res, next) => {
  if (err instanceof BusinessError) {
    res.status(400).json({ error: err.code, message: err.message });
  } else {
    console.error("Unhandled Error:", err); // 记录日志
    res.status(500).json({ error: "SERVER_ERROR", message: "Internal Server Error" });
  }
});

// 业务代码抛出错误
app.get("/order", (req, res, next) => {
  if (!user) throw new BusinessError("UNAUTHORIZED", "用户未登录");
  // ...
});
```

**优点**：

- 避免在每个路由中写 `try-catch`。
- 统一错误响应格式。

---

### **(2) 异步错误处理（Async/Await + 高阶函数）**

Node.js 中异步操作需显式捕获错误，可通过 **高阶函数** 或 `try-catch` 包装。  
**示例（高阶函数）**：

```javascript
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next); // 自动捕获异步错误
  };
}

// 使用方式
app.get("/user", asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new BusinessError("USER_NOT_FOUND", "用户不存在");
  res.json(user);
}));
```

**适用场景**：

- 简化 `async/await` 的错误处理。

---

### **(3) 前端全局错误监听（React/Vue）**

**React 示例（Error Boundary）**：

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logErrorToService(error, info); // 上报错误到 Sentry
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

// 使用方式
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

**Vue 示例（全局错误处理器）**：

```javascript
Vue.config.errorHandler = (err, vm, info) => {
  console.error("Vue Error:", err); // 或上报到 Sentry
};
```

---

## **2. 性能监控（Performance Monitoring）**

### **(1) Express/Koa 中间件监控请求耗时**

**示例（Express.js）**：

```javascript
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${duration}ms`);
    // 上报到 Prometheus（需集成 prom-client）
    httpRequestDuration.observe({ method: req.method, path: req.path }, duration);
  });
  next();
});
```

**集成 Prometheus**：

```javascript
const { collectDefaultMetrics, Summary } = require("prom-client");

collectDefaultMetrics(); // 收集默认指标

const httpRequestDuration = new Summary({
  name: "http_request_duration_ms",
  help: "HTTP request duration in milliseconds",
  labelNames: ["method", "path"],
});

// 暴露 /metrics 端点
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", "prom-client/plain-text");
  res.send(await register.metrics());
});
```

---

### **(2) 前端性能监控（Performance API + Sentry/RUM）**

**使用浏览器 Performance API**：

```javascript
// 监控页面加载时间
window.addEventListener("load", () => {
  const [entry] = performance.getEntriesByType("navigation");
  console.log("页面加载耗时:", entry.loadEventEnd - entry.startTime);
});

// 监控函数耗时
const start = performance.now();
expensiveCalculation(); // 耗时操作
const duration = performance.now() - start;
console.log(`函数执行耗时: ${duration}ms`);
```

**集成监控工具**：

- **Sentry**：错误和性能监控。
- **Datadog RUM**：前端真实用户监控。
- **Lighthouse CI**：自动化性能检测。

---

### **(3) APM 全链路监控（OpenTelemetry + Jaeger/SkyWalking）**

适用于分布式 Node.js 应用。  
**示例（OpenTelemetry + Jaeger）**：

```javascript
const { NodeTracerProvider } = require("@opentelemetry/node");
const { SimpleSpanProcessor } = require("@opentelemetry/tracing");
const { JaegerExporter } = require("@opentelemetry/exporter-jaeger");

const provider = new NodeTracerProvider();
provider.register();

const exporter = new JaegerExporter({ serviceName: "order-service" });
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

// 自动追踪 Express 请求
const { ExpressInstrumentation } = require("@opentelemetry/instrumentation-express");
const { registerInstrumentations } = require("@opentelemetry/instrumentation");

registerInstrumentations({
  instrumentations: [new ExpressInstrumentation()],
});
```

**效果**：

- 在 Jaeger UI 中查看请求链路和耗时。

---

## **总结**

| 关注点       | 方案                          | 适用场景                  | 工具/库示例                  |
|--------------|------------------------------|-------------------------|----------------------------|
| **异常处理** | Express/Koa 全局错误中间件     | Node.js Web 应用         | `express`, `koa`           |
|              | 高阶函数包装异步逻辑           | 避免重复 `try-catch`     | 自定义 `asyncHandler`      |
|              | 前端 Error Boundary           | React/Vue 错误捕获       | `Sentry`, `Vue.errorHandler` |
| **性能监控** | 中间件记录请求耗时            | HTTP API 监控            | `prom-client` (Prometheus) |
|              | 前端 Performance API          | 页面加载/函数耗时        | `Sentry`, `Datadog RUM`    |
|              | OpenTelemetry 全链路追踪      | 分布式系统               | `Jaeger`, `SkyWalking`     |

### **推荐工具链**

- **错误监控**：Sentry（全栈）、Bugsnag  
- **性能监控**：  
  - 后端：Prometheus + Grafana、OpenTelemetry  
  - 前端：Lighthouse、Datadog RUM  
- **日志管理**：ELK（Elasticsearch + Logstash + Kibana）  

通过合理选择工具和模式，可以高效实现异常和性能监控，同时保持代码整洁！ 🚀
