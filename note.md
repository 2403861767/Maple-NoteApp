# 枫叶笔记 — 开发问题记录

## 1. 技术选型：MyBatis-Plus 的 Starter 命名

| SpringBoot 版本 | 正确 starter |
|---|---|
| 2.x | `mybatis-plus-boot-starter` |
| 3.x | `mybatis-plus-spring-boot3-starter` |

**原因**：SpringBoot 3 把 `javax.*` 迁移到了 `jakarta.*`，MyBatis-Plus 为此单独发布了兼容包。用错会抛 `ClassNotFoundException`。

---

## 2. application.yml 常见坑

**datasource 必须挂在 `spring` 下，不能挂在 `server` 下：**
```yml
# 正确
spring:
  datasource:
    url: ...

# 错误 — datasource 被缩进到了 server 的子级
server:
  datasource:
```

**MySQL 8 URL 参数：**
- `serverTimezone=Asia/Shanghai` — 时区，否则 `create_time` 差 8 小时
- `characterEncoding=utf8mb4` — 支持 emoji，建表也要统一用 utf8mb4
- `useSSL=false` — 本地开发关 SSL，生产环境必须 `true`

---

## 3. DDL 建表语法要点

### 3.1 类型在前，约束在后
```sql
-- 正确
create_time DATETIME DEFAULT CURRENT_TIMESTAMP

-- 错误
create_time DEFAULT CURRENT_TIMESTAMP DATETIME
```

### 3.2 引号
- `'text'` — 单引号：字符串值
- `` `table_name` `` — 反引号：标识符（表名、列名）
- `user` 是 MySQL 保留字，必须加反引号

### 3.3 自动更新时间
```sql
create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```
- `DEFAULT CURRENT_TIMESTAMP` — 插入时自动填时间
- `ON UPDATE CURRENT_TIMESTAMP` — 更新记录时自动刷新时间
- `update_time` 需要**同时写两个**，少一个就有坑

### 3.4 外键约束
```sql
-- 写法 A：内联（不推荐，某些 MySQL 版本忽略）
user_id BIGINT REFERENCES `user`(id),

-- 写法 B：表级（推荐），放在所有列之后
user_id BIGINT NOT NULL,
FOREIGN KEY (user_id) REFERENCES `user`(id)
```
外键是数据库层面最后一道防线：防止删除父表数据后留下孤儿数据。

### 3.5 引擎和字符集
```sql
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
| 子句 | 作用 |
|------|------|
| `ENGINE=InnoDB` | 支持事务、行级锁、外键 |
| `CHARSET=utf8mb4` | 支持 emoji，避免中文乱码 |
| `COLLATE=utf8mb4_unicode_ci` | 排序规则，`_ci` = 大小写不敏感 |

---

## 4. 命名规范

项目中统一使用 **下划线命名**：
- `create_time` / `update_time`（与 PRD 保持一致）
- Java 实体对应属性：`createTime` / `updateTime`（MyBatis-Plus 驼峰自动映射）

---

## 5. Spring 核心概念：`@Configuration` vs `@Bean`

`@Configuration` 标记一个类为"配置类"，相当于 XML 时代的 `<beans>` 文件。
`@Bean` 标记一个方法，它的返回值会被放进 Spring 容器。

**为什么只用 `@Bean` 不行？**

Spring 在扫描时，只有加了 `@Configuration` 的类才会被 CGLIB 动态代理。代理后，一个 `@Bean` 方法内部调用另一个 `@Bean` 方法时，Spring 会拦截调用，保证拿到的始终是容器里**同一个实例**（单例）。

不加 `@Configuration`，类就是普通 Java 类——`@Bean` 方法之间直接调用不走代理，每次都 new 一个新对象，单例就失效了。

---

## 6. MyBatis-Plus 3.5.9+ 分页插件报红

从 3.5.9 开始，MyBatis-Plus 把 `jsqlparser`（SQL 解析器）从核心包拆成了独立模块。`PaginationInnerInterceptor` 依赖 jsqlparser，所以必须手动加依赖：

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-jsqlparser</artifactId>
    <version>${mybatis-plus.version}</version>
</dependency>
```

不加的话导入 `PaginationInnerInterceptor` 会一直报红，Maven 刷新也没用。

---

## 7. 密码加密：BCrypt vs MD5

| | MD5 | BCrypt |
|------|------|------|
| 速度 | 极快，每秒可算几十亿次 | 故意慢，默认 cost=10 |
| 加盐 | 需手动加盐 | 自动内嵌随机盐 |
| 被破解风险 | 彩虹表秒出 | 暴力破解成本极高 |
| 结论 | 不应用于密码存储 | Spring Security 默认方案 |

MD5 的设计目标是"快"，但密码存储恰恰需要"慢"——用 BCrypt。

---

## 8. 枚举（Enum）

枚举是"固定几个实例"的类，实例在定义时一次性列出：

```java
@Getter
public enum ErrorCode {
    SUCCESS(0, "ok"),              // ← 枚举常量，调构造器
    PARAMS_ERROR(40001, "参数错误"),
    SYSTEM_ERROR(40002, "系统内部异常"),
    OPERATION_ERROR(40003, "操作失败");

    private final int code;        // 字段必须是 private final
    private final String message;

    ErrorCode(int code, String message) {  // 构造器默认 private
        this.code = code;
        this.message = message;
    }
}
```

要点：
- 枚举常量必须在类的第一行，`()` 传参不是 `{}`
- 字段 `private final`，通过构造器注入
- 最后一个常量末尾是分号

---

## 9. 自定义异常（BusinessException）

```java
@Getter
public class BusinessException extends RuntimeException {
    private final int code;  // 额外携带错误码

    public BusinessException(int code, String message) { ... }
    public BusinessException(ErrorCode errorCode) { ... }  // code + message 都来自枚举
    public BusinessException(ErrorCode errorCode, String message) { ... }  // code 来自枚举，message 自定义
}
```

继承 `RuntimeException`：业务异常应该让调用方显式 catch，同时不污染方法签名。

---

## 10. 泛型（Generics）

`BaseResponse<T>` 中的 `<T>` 是类型参数：

```java
public class BaseResponse<T> {    // T 是占位符
    private T data;               // data 的类型由调用方决定
}

// 使用时：
BaseResponse<User> resp1;         // data 是 User
BaseResponse<List<Note>> resp2;   // data 是 List<Note>
```

泛型方法：
```java
public static <T> BaseResponse<T> success(T data) { ... }
//            ↑ <T> 在返回值前声明
```

---

## 11. 序列化（Serializable）

```
内存对象 —序列化→ 字节流/JSON —网络传输→ 前端
```

`Serializable` 是标记接口，告诉 JVM："这个类的对象可以被序列化"。SpringBoot 中 Jackson 自动做 JSON 序列化，`Serializable` 更多是约定。

---

## 12. SLF4J 日志占位符

```java
// 正确：{} 是占位符
log.error("业务异常: {}", e.getMessage());

// 错误：逗号不会拼接
log.error("业务异常: ", e.getMessage());
```

传入 Throwable 会打印完整堆栈：`log.error("RuntimeException:", e)`

---

## 13. 全局异常处理（@RestControllerAdvice）

```java
@RestControllerAdvice  // = @ControllerAdvice + @ResponseBody
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public BaseResponse<?> handleBusinessException(BusinessException e) {
        // 业务异常：原样返回 code + message
    }

    @ExceptionHandler(RuntimeException.class)
    public BaseResponse<?> handleRuntimeException(RuntimeException e) {
        // 未知异常：兜底，日志记堆栈，前端只看到"系统错误"
    }
}
```

拦截链：Controller 抛异常 → AOP 拦截 → 匹配 `@ExceptionHandler` → 返回 JSON。

---

## 14. 工具类设计模式（ThrowUtils）

```java
public class ThrowUtils {
    private ThrowUtils() {}  // 私有构造器，禁止 new

    public static void throwIf(boolean condition, RuntimeException exception) { ... }
    public static void throwIf(boolean condition, ErrorCode errorCode) { ... }
    public static void throwIf(boolean condition, ErrorCode errorCode, String message) { ... }
}
```

三个重载逐步升级：传入异常对象 → 传入 ErrorCode → 传入 ErrorCode + 自定义消息。

---

## 15. 当前项目结构

```
noteApp_Backend/src/main/java/com/seeleaf/noteapp/
├── NoteAppBackendApplication.java    ← @SpringBootApplication + @MapperScan
├── common/
│   ├── BaseResponse.java             ← 统一响应包装 (3 个构造器)
│   └── ResultUtils.java              ← 静态工厂 (success + 3 个 error)
├── config/
│   ├── MyBatisPlusConfig.java        ← 分页插件
│   └── MyMetaObjectHandler.java      ← 自动填充 createTime/updateTime
├── entity/
│   ├── User.java
│   ├── Category.java
│   ├── Tag.java
│   ├── Note.java
│   └── NoteTag.java
├── exception/
│   ├── ErrorCode.java                ← 错误码枚举
│   ├── BusinessException.java        ← 自定义运行时异常
│   ├── ThrowUtils.java               ← 断言式抛异常工具
│   └── GlobalExceptionHandler.java   ← @RestControllerAdvice 全局拦截
└── mapper/
    ├── UserMapper.java               ← extends BaseMapper<User>
    ├── CategoryMapper.java
    ├── TagMapper.java
    ├── NoteMapper.java
    └── NoteTagMapper.java
```

**已完成**：pom.xml 依赖、application.yml 配置、DDL 建表脚本、配置层、实体层、Mapper 层、通用工具层、UserService 服务层。
**待做**：NoteService / CategoryService / TagService 服务层、Controller 控制层、Spring Security + JWT 认证。

---

## 16. @Service 只能放实现类，不能放接口

Spring 通过扫描 `@Service`、`@Component` 等注解来创建 Bean。接口无法被 `new`，JVM 不知道怎么实例化它，所以 `@Service` 只能标记在实现类上。

```java
// 错误 — 接口加 @Service，Spring 无法实例化
@Service
public interface UserService extends IService<User> { }

// 正确
public interface UserService extends IService<User> { }  // 接口无注解

@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService { }
```

---

## 17. Service 层继承 IService / ServiceImpl 的意义

MyBatis-Plus 提供 `IService<T>`（接口规范）和 `ServiceImpl<M, T>`（默认实现）。继承后获得的方法分两个层级：

| 层级 | 归属 | 例子 |
|------|------|------|
| Mapper 层 | `baseMapper` | `insert`, `selectById`, `selectPage` |
| Service 层 | `this` | `save`, `getOne`, `list`, `page` |

**规则**：能用 Service 层方法就不要跳过它直接调 `baseMapper`（如 `this.save(user)` 优于 `baseMapper.insert(user)`），Service 层方法内部做了自动填充等额外处理。

---

## 18. @Value 是字段注解，不是类注解

`@Value("${key}")` 从 `application.yml` 读取配置值，注入到**字段**上。加在类上无效。

```java
// 错误 — @Value 放类上
@Value("${jwt.secret}")
public class JwtUtils { }

// 正确 — @Value 放字段上
@Component
public class JwtUtils {
    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;
}
```

Lombok 也有一个 `@lombok.Value`，含义完全不同（不可变对象）。注意 import 的是 `org.springframework.beans.factory.annotation.Value`。

---

## 19. @PostConstruct — 依赖注入完成后的一次性初始化

`@Value` 注入发生在构造器之后。如果在构造器里直接用 `secret`，它是 null。`@PostConstruct` 保证方法在**所有注入完成后**才执行：

```java
private SecretKey key;

@PostConstruct
private void init() {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
}
```

包路径：`jakarta.annotation.PostConstruct`（SpringBoot 3.x），不是 `javax.annotation.PostConstruct`。

---

## 20. 为什么 new JwtUtils() 会空指针

`@Component` 让 Spring 创建并管理实例，实例的 `@Value` 字段被 Spring 自动注入值。而 `new JwtUtils()` 是手动 new 出来的对象——不经过 Spring 容器，`@Value` 字段全是 null，`@Autowired` 字段也全是 null。

**原则**：有 `@Component` 的类不要自己 `new`，用 `@Autowired` 注入 Spring 管理好的实例。

---

## 21. JWT 安全原理

JWT 格式：`Header.Payload.Signature`（三段 Base64，`.` 分隔）

| 段 | 内容 | 特点 |
|----|------|------|
| Header | 算法类型（HS256） | 公开 |
| Payload | 业务数据（userId），明文 Base64 | 任何人都能解码看到，**不是加密的** |
| Signature | `HMAC-SHA256(Header + Payload, 密钥)` | 防篡改 |

**为什么安全**：攻击者能解码 Payload 看到 userId，也能把 userId=1 改成 userId=2。但改完后签名对不上——攻击者没有服务端密钥，算不出正确的新签名。服务端验签失败，Token 作废。

所以：**JWT 的密钥绝对不能泄露，也不能硬编码进代码（放 yml + gitignore）。**

---

## 22. jjwt 0.12.x 依赖与 API

依赖需要三个包：

```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.5</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.5</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.5</version>
    <scope>runtime</scope>
</dependency>
```

`jjwt-impl` 和 `jjwt-jackson` 是运行时依赖，编译时不需要，所以 `scope=runtime`。

核心 API（0.12.x 版本）：

```java
// 生成 token
Jwts.builder()
    .subject(userId.toString())
    .issuedAt(new Date())
    .expiration(new Date(System.currentTimeMillis() + expiration))
    .signWith(key)
    .compact();

// 解析 token（同时验证签名 + 过期）
Jwts.parser()
    .verifyWith(key)
    .build()
    .parseSignedClaims(token)
    .getPayload()
    .getSubject();
```

**密钥要求**：HMAC-SHA256 要求密钥至少 256 bit（32 字节），jjwt 0.12.x 会硬性校验，不够长直接抛异常。字符串 → Key 对象：

```java
SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
```

---

## 23. BCryptPasswordEncoder 独立引入

如果只需要密码加密（不需要 Spring Security 的认证/过滤器），只加 `spring-security-crypto`：

```xml
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-crypto</artifactId>
</dependency>
```

不要加整个 `spring-boot-starter-security`——它会自动启用认证过滤器链拦截所有请求，现在加会直接 401。

注册配置类：

```java
@Configuration
public class SecurityConfig {
    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

API：
- `encode(明文)` → 密文（每次加密结果不同，因为内嵌随机盐）
- `matches(明文, 密文)` → true/false

**注册用 `encode`，登录用 `matches`。不能登录时把明文再 encode 一次去和数据库比对，因为每次 encode 结果不同。**

---

## 24. DTO vs VO 分层约定

三层对象，数据传输方向不同：

| 类型 | 方向 | 职责 | 示例 |
|------|------|------|------|
| Entity（实体） | DB ↔ Service | 映射数据库表 | `User.java` |
| DTO（Data Transfer Object） | Controller → Service | 封装请求参数 | `RegisterRequest`, `LoginRequest` |
| VO（View Object） | Service → Controller → 前端 | 封装响应数据 | `LoginUserVO` |

**规则**：Entity 不要直接暴露给 Controller。注册用 `RegisterRequest` 接收参数，登录用 `LoginUserVO` 返回响应。这层隔离让以后改表结构时不至于直接炸到前端。

---

## 25. 数据脱敏：新对象 vs 修改原对象

返回脱敏数据时，**不能直接修改原对象**。原对象可能被缓存、被其他方法复用，set null 会导致副作用。

```java
// 错误 — 直接修改入参，会导致调用方后续使用时密码丢失
public User getSafeUser(User originUser) {
    originUser.setPassword(null);
    return originUser;
}

// 正确 — 创建新对象，不影响原对象
private LoginUserVO toLoginUserVO(User user, String token) {
    LoginUserVO vo = new LoginUserVO();
    BeanUtil.copyProperties(user, vo);  // Hutool 拷贝同名属性
    vo.setPassword(null);               // 脱敏
    vo.setToken(token);
    return vo;
}
```

---

## 26. 安全提示：防止用户名枚举

登录时，"用户名不存在" 和 "密码错误" 的错误提示必须**完全一样**（如都提示"用户名或密码错误"）。如果提示不同，攻击者可以通过错误消息判断哪些用户名已注册，这就是"用户名枚举漏洞"。

---

## 27. JWT 登出的三种方案

JWT 是无状态的——服务端不存任何东西，无法主动让 Token 失效。

| 方案 | 原理 | 复杂度 | 适用场景 |
|------|------|--------|---------|
| 纯前端登出 | 前端删除 Token，后端不做任何操作 | 零 | 学习项目、内部工具 |
| Token 黑名单（Redis） | 登出时把 Token 加入 Redis 黑名单，设 TTL = Token 剩余有效期，每次请求先查黑名单 | 中 | 生产环境、需要即时失效 |
| Token 版本号（DB） | User 表加 `token_version` 字段，登出时版本 +1，JWT Payload 带版本号，校验时对比 | 中 | 不需要 Redis 的生产方案 |

当前项目：先采用方案 1（纯前端登出），后期引入 Redis 后升级到方案 2。

---

## 28. Spring Security 过滤器链顺序

JWT 过滤器必须放在 `UsernamePasswordAuthenticationFilter` **之前**（通过 `addFilterBefore`），原因：

- `UsernamePasswordAuthenticationFilter` 是默认的表单登录过滤器（提取 username/password 参数）
- JWT 过滤器放前面，解析 token 后直接把 `Authentication` 塞进 `SecurityContextHolder`
- 后面的过滤器发现上下文已有认证信息，自动跳过
- 如果放后面，每个请求会多走一层无用的表单认证逻辑

**配置模板**：

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/user/register", "/api/user/login").permitAll()
            .anyRequest().authenticated()
        )
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
}
```

| 配置项 | 作用 | 为什么 |
|--------|------|--------|
| `csrf().disable()` | 关闭 CSRF 防护 | 前后端分离，无 Cookie，不存在 CSRF 攻击面 |
| `STATELESS` | 无 Session | JWT 本身就是无状态凭证，不需要 Session |
| `requestMatchers(...).permitAll()` | 指定路径匿名可访问 | 注册和登录不需要登录 |
| `anyRequest().authenticated()` | 其余路径必须认证 | 兜底规则 |

---

## 29. JwtAuthenticationFilter 链路

```
请求 → 取 Authorization 头 → 没有/Bearer 格式不对 → 放行（后面 Security 规则拦截）
                            → 有 token → 解析 userId → 查库确认用户存在
                                      → 构建 Authentication 对象
                                      → SecurityContextHolder.getContext().setAuthentication(...)
                                      → filterChain.doFilter() 放行
```

`OncePerRequestFilter` 保证每个请求只经过一次此过滤器（即使请求被转发或包含多个子请求）。

解析 token 异常时不应抛异常，而是放行——让 SecurityConfig 的 `.authenticated()` 拦掉并返回标准 403/401 响应。

---

## 30. SecurityUtils — 从上下文拿当前用户

```java
public class SecurityUtils {
    private SecurityUtils() {}  // 私有构造器

    public static Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new BusinessException(ErrorCode.NO_LOGIN_ERROR);
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof User)) {
            throw new BusinessException(ErrorCode.NO_LOGIN_ERROR);
        }
        return ((User) principal).getId();
    }
}
```

注意：`getPrincipal()` 返回 `Object`，必须先 `instanceof` 校验再强转，否则 ClassCastException。

## 31. 构造器注入 vs 字段注入

Spring 官方推荐构造器注入：

```java
// 构造器注入（推荐）
@RestController
public class UserController {
    private final UserService userService;
    
    public UserController(UserService userService) {
        this.userService = userService;
    }
}

// 字段注入（不推荐）
@RestController
public class UserController {
    @Autowired
    private UserService userService;
}
```

理由：
- 字段可声明 `final`，运行时不会被意外修改
- 单元测试可以不启动 Spring 容器，直接 `new UserController(mockService)`
- 不依赖反射注入，编译期就能发现依赖问题

---

## 32. Token 存储在浏览器的位置（前端篇）

| 位置 | API | 容量 | XSS 风险 | CSRF 风险 | 推荐度 |
|------|-----|------|----------|----------|--------|
| **localStorage** | `localStorage.setItem("token", value)` | 5MB | 高（JS 可读） | 安全（不自动附带） | ⭐⭐⭐ 最常用 |
| **sessionStorage** | `sessionStorage.setItem("token", value)` | 5MB | 高（JS 可读） | 安全 | ⭐⭐ 关标签页即清除 |
| **Cookie + HttpOnly** | 服务端 `Set-Cookie` | 4KB | 安全（JS 不可读） | 需配 SameSite | ⭐⭐⭐ 最安全 |

**当前项目**：login 接口返回 JSON 里的 token，前端拿到后存 `localStorage`。后续请求通过 Axios 拦截器自动加到 `Authorization: Bearer xxx` 请求头。

---

## 33. 测试工具中 Token 的传递（Apifox / Postman / curl）

测试工具**没有浏览器**，不会自动存 token。每次请求需手动传递：

| 工具 | 方式 |
|------|------|
| **Postman** | Authorization 标签页 → 选 Bearer Token → 粘贴 token |
| **Apifox** | 同上，或在"环境变量"里设好自动填入 |
| **curl** | `curl -H "Authorization: Bearer <token>" http://localhost:8080/api/xxx` |

测试流程：
1. 调 `/api/user/login` → 复制返回的 token
2. 后续请求手动在 Header 加 `Authorization: Bearer <token>`

后期有前端后，login 成功后前端代码自动存 + 自动带，这套手动流程就不需要了。

---

## 34. Spring Security 循环依赖问题

堆栈：`JwtAuthenticationFilter → UserService → BCryptPasswordEncoder → SecurityConfig → JwtAuthenticationFilter`

**解法**：JwtAuthenticationFilter 不需要 Service 层完整业务逻辑，只需要查用户。注入 `UserMapper` 替代 `UserService` 即可破环：

```java
// 原来（形成循环）
@Autowired
private UserService userService;

// 改成（破环）
@Autowired
private UserMapper userMapper;
```

原则：**Filter 层的依赖要尽可能轻**，不要注入 Service（会带进来一堆间接依赖）。直接用 Mapper 或 JdbcTemplate。

---

## 35. Spring Boot 默认生成的随机密码

启动日志里出现 `Using generated security password: xxxxx` 是正常现象。Spring Boot 自动配置检测到 `spring-boot-starter-security` 后，自动创建了一个内存中的默认用户 `user`，附带随机密码。

这个**和你的 JWT 认证是两套独立的认证方式**，随机密码用户没人用，不影响你的 JWT 流程。

消除方法（二选一）：
```java
// 方法 A：排除自动配置
@SpringBootApplication(exclude = {
    UserDetailsServiceAutoConfiguration.class
})

// 方法 B：yml 里指定默认账户信息（Spring 发现你配了就不会自动生成）
spring.security.user.name=admin
spring.security.user.password=not-used
```

---

## 36. LambdaQueryWrapper 的 AND/OR 嵌套陷阱

不加 `.and()` 时，OR 会破坏 AND 条件的作用域：

```java
// 错误 — SQL 变成: WHERE user_id = ? AND title LIKE '%x%' OR content LIKE '%x%'
// AND 优先级高于 OR → OR 后面的条件不受 user_id 限制！
queryWrapper
    .eq(Note::getUserId, userId)
    .like(Note::getTitle, keyword)
    .or()
    .like(Note::getContent, keyword);

// 正确 — SQL: WHERE user_id = ? AND (title LIKE '%x%' OR content LIKE '%x%')
queryWrapper
    .eq(Note::getUserId, userId)
    .and(w -> w
        .like(Note::getTitle, keyword)
        .or()
        .like(Note::getContent, keyword));
```

**规则**：只要用了 `.or()`，就必须用 `.and()` 包裹 OR 条件组，否则会泄漏数据。

---

## 37. 分类树用 HashMap 分组 O(n)

按 parentId 构建树，用 `Map<Long, List<Category>>` 一次遍历分组，HashMap get 是 O(1)，整体 O(n)：

```java
Map<Long, List<Category>> map = new HashMap<>();
for (Category c : list) {
    map.putIfAbsent(c.getParentId(), new ArrayList<>());
    map.get(c.getParentId()).add(c);
}
// 顶层节点：map.getOrDefault(null, emptyList())
```

注意：如果 parentId 在库中是 NULL，Map 的 key 用 null，不是 0L。

---

## 38. 递归数据类型 — TreeNode 自己套自己

```java
public class CategoryTreeNode {
    private Long id;
    private String name;
    private List<CategoryTreeNode> children;  // 自己包含自己 → 支持任意深度
}
```

比 Level1 + Level2 的硬编码模型更灵活，支持无限层级。

---

## 39. 级联删除分类（递归）

删除分类前先删所有子分类，子分类还有子分类就继续递归——**叶子先删，根后删**：

```java
// 查子分类
List<Category> children = this.list(wrapper.eq(Category::getParentId, id));
// 递归删子分类
for (Category child : children) {
    this.deleteCategory(child.getId());
}
// 最后删自己
this.removeById(id);
```

---

## 40. 删除笔记/标签时清理中间表

多对多关系的中间表，删除一端前必须先删中间表记录，否则外键约束报错或产生孤儿数据：

```java
// 删标签前清中间表
noteTagService.remove(new LambdaQueryWrapper<NoteTag>().eq(NoteTag::getTagId, tagId));
this.removeById(tagId);

// 删笔记前清中间表
noteTagService.remove(new LambdaQueryWrapper<NoteTag>().eq(NoteTag::getNoteId, noteId));
this.removeById(noteId);
```

---

## 41. 复合主键 + MyBatis-Plus 的坑

MyBatis-Plus 不支持复合主键（如 `PRIMARY KEY (note_id, tag_id)`）。即使只给 `noteId` 加 `@TableId`，`selectById`、`deleteById`、`updateById` 只会按这一个字段操作，会删错数据。

**解法**：加代理主键 `id BIGINT AUTO_INCREMENT`，原复合列改成唯一索引 `UNIQUE KEY (note_id, tag_id)`。

---

## 42. updateById 直接改原对象 vs new 新对象

```java
// 推荐：查出来直接改，只动允许修改的字段
Category category = this.getOne(queryWrapper);  // 带权限校验
category.setName(name);
this.updateById(category);  // id/parentId/userId/createTime 都没动

// 不推荐：new 新对象，容易漏字段导致 null 覆盖
Category category = new Category();
category.setName(name);
this.updateById(category);  // id=null 更不了，其他字段 null 可能覆盖
```

---

## 43. updateTag 重名校验防止误判自己

更新标签时，如果没改名，查重会查到"自己"：

```java
Tag existing = this.getOne(wrapper.eq(Tag::getName, newName)...);
// 查到同名，但如果是自己 ID 就放过
ThrowUtils.throwIf(existing != null && !existing.getId().equals(request.getId()), ...);
```

---

## 44. MySQL Connector/J 9.x 字符集改名

`characterEncoding=utf8mb4` 在 Connector/J 9.x 不可用，改为 `characterEncoding=UTF-8`（Java 标准编码名）。

---

## 45. Spring Security requestMatchers 与 context-path 的关系

`application.yml` 里配了 `server.servlet.context-path: /api` 后，Spring Security 的 `requestMatchers` 匹配的是去掉 context-path 后的路径：

```yml
server.servlet.context-path: /api
```

```java
// requestMatchers 里不要加 /api 前缀：
.requestMatchers("/user/register", "/user/login").permitAll()  // 正确
.requestMatchers("/api/user/register", "/api/user/login").permitAll()  // 错误，永远匹配不上
```

---

## 46. Spring Security 403 vs 401

| 状态码 | 含义 | 发生场景 |
|--------|------|---------|
| 401 Unauthorized | 未认证 | 没带 Token 访问需要登录的接口 |
| 403 Forbidden | 无权 | 带了 Token 但权限不够 |

Spring Security 默认未认证返回 403（而非 401），这是 Security 的默认行为，不影响功能。

---

## 47. 当前项目完整结构（2026-05-11）

```
noteApp_Backend/src/main/java/com/seeleaf/noteapp/
├── NoteAppBackendApplication.java
├── common/
│   ├── BaseResponse.java
│   ├── JwtUtils.java
│   ├── PageRequest.java
│   ├── ResultUtils.java
│   └── SecurityUtils.java
├── config/
│   ├── JwtAuthenticationFilter.java
│   ├── Knife4jConfig.java
│   ├── MyBatisPlusConfig.java
│   ├── MyMetaObjectHandler.java
│   └── SecurityConfig.java
├── controller/
│   ├── CategoryController.java
│   ├── NoteController.java
│   ├── TagController.java
│   └── UserController.java
├── entity/
│   ├── Category.java
│   ├── Note.java
│   ├── NoteTag.java
│   ├── Tag.java
│   └── User.java
├── exception/
│   ├── BusinessException.java
│   ├── ErrorCode.java
│   ├── GlobalExceptionHandler.java
│   └── ThrowUtils.java
├── mapper/
│   ├── CategoryMapper.java
│   ├── NoteMapper.java
│   ├── NoteTagMapper.java
│   ├── TagMapper.java
│   └── UserMapper.java
├── model/
│   ├── request/
│   │   ├── CategoryRequest/
│   │   │   ├── CreateCategoryRequest.java
│   │   │   └── UpdateCategoryRequest.java
│   │   ├── NoteRequest/
│   │   │   ├── CreateNoteRequest.java
│   │   │   ├── NoteQueryRequest.java
│   │   │   └── UpdateNoteRequest.java
│   │   ├── Tag/
│   │   │   ├── CreateTagRequest.java
│   │   │   └── UpdateTagRequest.java
│   │   └── userRequest/
│   │       ├── LoginRequest.java
│   │       └── RegisterRequest.java
│   └── vo/
│       ├── Category/
│       │   └── CategoryTreeNode.java
│       ├── Note/
│       │   └── NotesVO.java
│       └── User/
│           ├── LoginUserVO.java
│           └── UserVO.java
└── service/
    ├── CategoryService.java
    ├── NoteService.java
    ├── NoteTagService.java
    ├── TagService.java
    ├── UserService.java
    └── impl/
        ├── CategoryServiceImpl.java
        ├── NoteServiceImpl.java
        ├── NoteTagServiceImpl.java
        ├── TagServiceImpl.java
        └── UserServiceImpl.java
```

**已完成**：全模块 Service 层 + Controller 层 + Spring Security + JWT 认证。
**待做**：Spring AI 集成（RAG）、前端 Vue3。

---

## 48. Phase 1 功能评估 (2026-05-20)

### 48.1 所见即所得编辑器 — TipTap 集成

基于 [@tiptap/vue-3](https://tiptap.dev/) + StarterKit + Image + Link + Underline + Placeholder。

**数据流**：TipTap(HTML) → turndown → Markdown(存DB) → marked → HTML(预览/TipTap回填)

**核心 Bug — useEditor 只在挂载时读一次 content prop**：
```js
// TipTapEditor.vue — 初始化时读一次，不会响应 prop 变化
const editor = useEditor({
  content: props.modelValue,  // 挂载时为空，之后变了也不更新
})
```
**解法**：异步加载数据后，显式调用暴露的 `setContent()`：
```js
// 加载已有笔记后：
editorHtml.value = html
editorRef.value?.setContent(html)  // 必须手动同步
```

### 48.2 暗色模式实现

方案：`html.dark` CSS 类 + CSS 自定义属性（design tokens）。

**两处 key 逻辑**：

1. **主题初始化**（必须在 Vue 挂载前执行，否则会有闪烁）：
```js
// main.js — 在 app.mount() 之前
(function initTheme() {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  }
})()
```

2. **系统主题变化监听**：`matchMedia(...).addEventListener('change', ...)` — 只在用户未手动覆盖时生效。

3. **CSS 变量切换**：`:root` 定义亮色变量，`html.dark` 覆盖暗色变量。Element Plus 变量也需同步覆盖（`--el-*`）。

### 48.3 图片上传安全链

从外到内的校验层：

| 层 | 位置 | 校验 |
|----|------|------|
| 前端类型 | NoteEdit.vue | `accept="image/jpeg,image/png,image/gif,image/webp"` |
| 前端类型+大小 | handleImageUpload | MIME type + `file.size > 5MB` |
| 后端大小 | NoteServiceImpl | `file.getSize() > imageMaxSize` |
| 后端 MIME | NoteServiceImpl | `ALLOWED_IMAGE_TYPES` 白名单 |
| 后端扩展名 | NoteServiceImpl | `ALLOWED_EXTENSIONS` 白名单 |
| 路径限制 | uploadPath 拼接 | `userId + UUID + ext` 防路径穿越 |

**为什么 MIME 和扩展名都要校验**：MIME 来自 Content-Type 头，可以被伪造。扩展名来自文件名，也可以伪造。两者都校验是纵深防御。

### 48.4 TipTap setContent 的边界条件

```js
function setContent(html) {
  if (!editor.value || html === editor.value.getHTML()) return
  editor.value.commands.setContent(html)
}
```

`html === editor.value.getHTML()` 的比较避免了不必要的 DOM 重写（频繁 setContent 会破坏 undo history）。

---

## 49. HTML ↔ Markdown 双向转换的陷阱

当前数据流中 `turndown` 和 `marked` 不是互逆操作：

- **turndown**：HTML → Markdown，会丢失内联样式、自定义 class
- **marked**：Markdown → HTML，解析时依赖 GFM/breaks 等配置

**来回一次 = 格式精度损失**。比如 TipTap 的嵌套表格、行内颜色标记，经过一轮往返可能消失。

**改进方向**：数据库同时存 `content_md` 和 `content_html`。编辑时从 HTML 恢复（保真），搜索/导出时用 Markdown（方便）。避免实时转换。

---

## 50. axios 拦截器 + 调用方双重错误提示

**问题**：拦截器已在全局 `ElMessage.error`，调用方 `.catch()` 里又弹一次。

**正确分工**：
- 拦截器：处理通用错误（401 跳转、网络异常提示）
- 调用方：处理业务恢复逻辑（关闭 loading、重置表单），不弹错误

**反例**：
```js
// 错误 — 拦截器已弹了"请求失败"，这里又弹
} catch (err) {
  ElMessage.error(err.message || '图片上传失败')
}

// 正确 — 只做恢复，不重复提示
} catch {
  // 拦截器已处理
}
```

---

## 51. window.open 被拦截的检测

浏览器可能阻止 `window.open()`（弹窗拦截器），此时返回 `null`。必须在代码中处理：

```js
const printWindow = window.open(url, '_blank')
if (!printWindow) {
  URL.revokeObjectURL(url)  // 清理 Blob
  ElMessage.warning('浏览器已阻止弹窗，请允许本站弹窗后重试')
}
```

不处理的结果：Blob 一直在内存中，用户不知道发生了什么。

---

## 52. @Transactional 与递归方法调用（自调用陷阱）

**问题**：`deleteCategory` 递归删除子分类，但没有 `@Transactional`。如果中途某个子分类删除失败，已删除的无法回滚。

**修复**：
```java
@Override
@Transactional  // 整个递归在一个事务里，任意子节点失败全部回滚
public Boolean deleteCategory(Long categoryId) { ... }
```

**注意**：Spring `@Transactional` 基于 AOP 代理。递归自调用（`this.deleteCategory(childId)`）走的是 `this` 引用，而非代理对象，所以**内部递归调用的事务传播需要看具体情况**：

- 如果外层方法加了 `@Transactional`，内层 `this.xxx()` 调用在**同一个事务**内（因为没有跨越代理边界）
- 这正是我们想要的行为——递归删除整体作为一个原子操作

**关键点**：`@Transactional` 只回滚数据库操作，**不回滚文件系统操作**。

---

## 53. 文件上传与 DB 事务不一致问题

`uploadAvatar` 做的事情：
```
1. file.transferTo(destPath)  // 写入磁盘
2. this.updateById(updateUser)  // 更新 DB
```

即使加了 `@Transactional`，步骤 1 成功后步骤 2 失败，步骤 1 的磁盘文件**不会被自动清理**。`@Transactional` 管不到文件系统。

**处理策略（从差到好）**：
| 策略 | 做法 | 代价 |
|------|------|------|
| 接受孤儿文件 | 不做任何处理 | 磁盘慢慢堆积垃圾 |
| 调换顺序 | 先写 DB 再写文件 | 文件写入失败时 DB 已改（avatarUrl 指向旧文件，无伤大雅） |
| 定期清理任务 | 定时扫 uploads 目录，清理未被引用的文件 | 需要额外的清理逻辑 |
| 对象存储 | 用 MinIO/S3，文件上传成功返回 URL 后再写 DB | 引入额外组件 |

当前阶段（Phase 1）：采用"接受孤儿文件"策略，磁盘空间充足时这不是紧急问题。

---

## 54. 日志级别：log.error vs log.warn

| 级别 | 含义 | 触发场景 |
|------|------|---------|
| `log.error` | 系统故障，需要立即关注 | RuntimeException、DB 连接失败、OOM |
| `log.warn` | 预期内的异常，不需要告警 | 用户名重复、参数校验失败、token 过期 |
| `log.info` | 关键业务流程 | 用户注册成功、笔记创建 |
| `log.debug` | 调试信息 | SQL 参数、中间变量 |

**BusinessException 属于 `warn` 级别**——它是"用户操作不对"而非"系统出了问题"。用 `error` 会触发监控告警，淹没真正的故障。

```java
// GlobalExceptionHandler
@ExceptionHandler(BusinessException.class)
public BaseResponse<?> handleBusinessException(BusinessException e) {
    log.warn("业务异常: {}", e.getMessage());  // warn，不是 error
    return ResultUtils.error(e.getCode(), e.getMessage());
}
```

---

## 55. 冗余导入的清理纪律

重构（如合并两个模块的功能）后，必须检查调用方的 import 是否冗余。典型案例：

```js
// NoteEdit.vue — 修复前
import { renderMarkdown } from '../utils/md'                        // ← 与下行功能相同
import { markdownToHtml, htmlToMarkdown } from '../composables/useMarkdownConverter'

// 修复后（两者指向同一函数，去掉一个）
import { markdownToHtml, htmlToMarkdown } from '../composables/useMarkdownConverter'
const previewHtml = computed(() => markdownToHtml(form.content))  // 统一入口
```

**原则**：一个功能只从一个入口导入。如果两个模块导出了相同逻辑，选一个作为唯一来源，另一个做 re-export 或直接删除。
