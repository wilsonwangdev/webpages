# 异常处理和性能监控

在软件开发中，**异常处理（Exception Handling）** 和 **性能监控（Performance Monitoring）** 是典型的 **Cross-cutting concerns（横切关注点）**，需要通过合理的设计模式或技术手段实现，避免代码重复和耦合。以下是它们的常见实现方式：

---

## **1. 异常处理（Exception Handling）**

异常处理的目标是 **统一捕获、记录和处理错误**，避免 `try-catch` 块散落在业务代码中。

### **实现方式**

#### **(1) 全局异常处理器（Global Exception Handler）**

适用于 Web 应用（如 Spring Boot、Express.js），集中处理所有未捕获的异常。  
**示例（Spring Boot）**：

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class) // 捕获所有异常
    public ResponseEntity<ErrorResponse> handleException(Exception ex) {
        ErrorResponse error = new ErrorResponse(
            "SERVER_ERROR", 
            "系统异常: " + ex.getMessage()
        );
        return ResponseEntity.status(500).body(error);
    }

    @ExceptionHandler(BusinessException.class) // 捕获自定义业务异常
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex) {
        ErrorResponse error = new ErrorResponse(ex.getCode(), ex.getMessage());
        return ResponseEntity.status(400).body(error);
    }
}
```

**优点**：

- 避免在每个 Controller 中写 `try-catch`。
- 统一返回错误格式（如 JSON）。

---

#### **(2) AOP 切面统一处理异常**

通过 AOP 拦截方法调用，捕获异常并记录日志或转换错误。  
**示例（Spring AOP）**：

```java
@Aspect
@Component
public class ExceptionHandlingAspect {

    @AfterThrowing(
        pointcut = "execution(* com.example.service.*.*(..))", 
        throwing = "ex"
    )
    public void handleServiceException(Exception ex) {
        log.error("Service 层异常: ", ex);
        // 可在此转换异常或发送告警
    }
}
```

**适用场景**：

- 需要针对特定层（如 Service）的异常做额外处理。

---

#### **(3) 装饰器模式（Decorator Pattern）**

包装目标方法，自动处理异常（适用于非 AOP 环境）。  
**示例（Python）**：

```python
def handle_errors(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except BusinessError as e:
            log.error(f"业务异常: {e}")
            return {"error": e.code}
        except Exception as e:
            log.error(f"系统异常: {e}")
            return {"error": "SYSTEM_ERROR"}
    return wrapper

@handle_errors  # 装饰器自动处理异常
def process_order():
    if not inventory_available():
        raise BusinessError("INSUFFICIENT_STOCK")
```

**优点**：

- 灵活控制异常处理逻辑。

---

## **2. 性能监控（Performance Monitoring）**

性能监控的目标是 **统计方法执行时间、吞吐量等指标**，便于优化系统瓶颈。

### **实现方式**

#### **(1) AOP 切面监控方法耗时**

**示例（Spring AOP + Prometheus）**：

```java
@Aspect
@Component
public class PerformanceAspect {

    private final Summary methodDurationSummary;

    public PerformanceAspect() {
        methodDurationSummary = Summary.build()
            .name("method_execution_time")
            .help("Method execution time in seconds")
            .register(); // Prometheus 指标注册
    }

    @Around("execution(* com.example.service.*.*(..))")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();
        Object result = joinPoint.proceed(); // 执行目标方法
        long duration = System.currentTimeMillis() - startTime;
        
        methodDurationSummary.observe(duration / 1000.0); // 记录指标
        log.info("方法 {} 执行耗时: {} ms", joinPoint.getSignature(), duration);
        return result;
    }
}
```

**集成监控系统**：

- **Prometheus + Grafana**：收集指标并可视化。
- **ELK（Elasticsearch + Logstash + Kibana）**：分析日志中的性能数据。

---

#### **(2) 使用现成的 APM 工具**

- **Java**：  
  - [SkyWalking](https://skywalking.apache.org/)  
  - [Micrometer](https://micrometer.io/)（集成 Prometheus）  
- **Node.js**：  
  - [OpenTelemetry](https://opentelemetry.io/)  
- **Python**：  
  - [Datadog APM](https://www.datadoghq.com/product/apm/)  

**示例（Micrometer + Spring Boot）**：

```yaml
# application.yml
management:
  metrics:
    export:
      prometheus:
        enabled: true
  endpoint:
    prometheus:
      enabled: true
```

自动暴露 `/actuator/prometheus` 端点供 Prometheus 抓取。

---

#### **(3) 中间件监控 HTTP 请求耗时**

**示例（Express.js）**：

```javascript
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        console.log(`${req.method} ${req.url} 耗时 ${Date.now() - start}ms`);
    });
    next();
});
```

**进阶方案**：

- 使用 [OpenTelemetry for Node.js](https://opentelemetry.io/docs/instrumentation/js/) 自动追踪请求链路。

---

## **总结**

| 关注点       | 实现方案                          | 适用场景                           |
|--------------|----------------------------------|----------------------------------|
| **异常处理** | 全局异常处理器（`@ControllerAdvice`） | Web 应用统一错误响应               |
|              | AOP 切面                          | 特定层（如 Service）的异常处理     |
|              | 装饰器模式                        | 非 AOP 环境（如 Python）          |
| **性能监控** | AOP + Prometheus/Micrometer      | Java/Spring 应用                  |
|              | APM 工具（SkyWalking, Datadog）   | 全链路监控（分布式系统）           |
|              | 中间件记录请求耗时                | Web 服务器（如 Express.js, Nginx） |

**核心原则**：  

- **解耦**：避免业务代码混杂监控或异常处理逻辑。  
- **自动化**：通过 AOP、装饰器或现成工具减少手动编码。  
- **可视化**：集成监控系统（如 Grafana）实时查看性能数据。  

通过合理设计，可以高效实现异常处理和性能监控，同时保持代码整洁！ 🚀
