# PRD：枫叶笔记系统 (Maple Leaf Note)

### 1. 产品概述

**产品名称**：枫叶笔记 (Maple Leaf Note)

**产品定位**：面向个人用户的轻量级在线笔记管理系统，支持笔记的创建、编辑、归类和检索。

**目标用户**：需要记录和整理个人知识的用户（学生、开发者、知识工作者）。

**核心价值**：让用户能够高效地记录、组织和检索自己的知识笔记。

---

### 2. 技术选型

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 开发语言 | Java | 17/21 | LTS 版本，生态稳定 |
| 后端框架 | Spring Boot | 3.x | 核心框架，自动配置 + 起步依赖 |
| ORM | MyBatis-Plus | 3.5+ | LambdaQueryWrapper 类型安全查询，分页插件 |
| 数据库 | MySQL | 8.0 | 关系型数据库，支持 FULLTEXT 全文索引 |
| 连接池 | HikariCP | — | Spring Boot 默认连接池，性能最优 |
| 认证 | Spring Security + JWT | — | 无状态认证，jjwt 库 |
| 密码加密 | BCrypt | — | Spring Security 内置 PasswordEncoder |
| 校验 | Jakarta Validation | — | 注解式参数校验 |
| JSON | Jackson | — | Spring Boot 默认序列化 |
| API 文档 | Knife4j / SpringDoc | — | OpenAPI 3.0 规范，Swagger UI |
| 前端框架 | Vue 3 | 3.x | 组合式 API，`<script setup>` 语法 |
| 构建工具 | Vite | 5.x | 快速冷启动 + HMR |
| UI 组件库 | Element Plus | — | Vue 3 生态，组件丰富 |
| HTTP 客户端 | Axios | — | 拦截器统一处理 Token 和异常 |
| 富文本编辑器 | Tiptap / Quill | — | 笔记编辑核心组件 |
| 前端路由 | Vue Router | 4.x | SPA 路由 |
| 状态管理 | Pinia | 2.x | Vue 3 官方推荐 |
| 构建工具 | Maven | 3.8+ | 后端依赖管理 + 打包 |
| AI 集成 | Spring AI | 1.0+ | 后续 v2.0 接入 RAG |

---

### 3. 用户故事

| 编号 | 角色 | 需求 | 目的 |
|------|------|------|------|
| US-01 | 用户 | 注册/登录账号 | 拥有独立的笔记空间 |
| US-02 | 用户 | 创建笔记 | 记录自己的想法和知识 |
| US-03 | 用户 | 编辑/删除笔记 | 保持笔记内容的时效性和准确性 |
| US-04 | 用户 | 将笔记归类到分类下 | 按主题整理笔记 |
| US-05 | 用户 | 为笔记添加标签 | 通过多维度对笔记进行标记 |
| US-06 | 用户 | 搜索笔记 | 快速找到需要的笔记 |
| US-07 | 用户 | 查看笔记列表 | 浏览自己所有的笔记 |
| US-08 | 用户 | 管理分类 | 创建、编辑、删除自己的分类 |
| US-09 | 用户 | 管理标签 | 创建、编辑、删除自己的标签 |
| US-10 | 用户 | 修改个人信息 | 更新密码等个人设置 |

---

### 4. 功能模块

#### 4.1 用户模块 (User Module)

**3.1.1 注册**
- 用户通过用户名 + 密码注册
- 用户名全局唯一，长度 3-20 字符
- 密码长度 6-30 字符，需包含字母和数字
- 密码使用 BCrypt 加密存储

**3.1.2 登录**
- 用户名 + 密码登录
- 登录成功后返回 JWT Token
- Token 有效期 7 天

**3.1.3 用户信息**
- 查看/修改基本信息（昵称、头像等）
- 修改密码（需验证旧密码）

#### 4.2 笔记模块 (Note Module)

**3.2.1 笔记 CRUD**
- 创建笔记：标题、正文内容、所属分类、标签
- 编辑笔记：修改标题、内容、分类、标签
- 删除笔记：软删除（逻辑删除，可恢复）
- 查看笔记：支持查看详情

**3.2.2 笔记列表**
- 分页查询自己的笔记
- 按分类筛选
- 按标签筛选
- 按创建时间/更新时间排序
- 支持关键字搜索（标题 + 内容模糊匹配）

**3.2.3 权限控制**
- 用户只能查看/编辑/删除自己创建的笔记
- 后端通过 JWT 解析当前用户 ID，所有查询强制带上 `user_id` 条件

#### 4.3 分类模块 (Category Module)

**3.3.1 分类 CRUD**
- 创建分类：分类名称、父分类 ID（支持二级层级）
- 编辑分类：修改分类名称
- 删除分类：若分类下有笔记，提示用户先处理笔记
- 查看分类列表：按树形结构展示

**3.3.2 约束**
- 同一用户下分类名称唯一
- 每个用户最多创建 50 个一级分类

#### 4.4 标签模块 (Tag Module)

**3.4.1 标签 CRUD**
- 创建标签：标签名称
- 编辑标签：修改标签名称
- 删除标签：解除与笔记的关联后删除
- 查看标签列表

**3.4.2 约束**
- 同一用户下标签名称唯一
- 一个笔记可以有多个标签，一个标签下可以有多个笔记（多对多关系）

---

### 5. 数据模型设计

#### 5.1 核心实体

```
user (用户)
  - id            BIGINT      PK
  - username      VARCHAR(20) UNIQUE
  - password      VARCHAR(255)
  - nickname      VARCHAR(50)
  - avatar_url    VARCHAR(255)
  - create_time    DATETIME
  - update_time    DATETIME

category (分类)
  - id            BIGINT      PK
  - user_id       BIGINT      FK → user.id
  - name          VARCHAR(50)
  - parent_id     BIGINT      FK → category.id (NULL=一级分类)
  - sort_order    INT
  - create_time    DATETIME
  - update_time    DATETIME

tag (标签)
  - id            BIGINT      PK
  - user_id       BIGINT      FK → user.id
  - name          VARCHAR(30)
  - create_time    DATETIME

note (笔记)
  - id            BIGINT      PK
  - user_id       BIGINT      FK → user.id
  - category_id   BIGINT      FK → category.id (可为空)
  - title         VARCHAR(200)
  - content       LONGTEXT
  - is_deleted    TINYINT     DEFAULT 0 (逻辑删除)
  - create_time    DATETIME
  - update_time    DATETIME

note_tag (笔记-标签关联)
  - note_id       BIGINT      FK → note.id
  - tag_id        BIGINT      FK → tag.id
  - PK (note_id, tag_id)
```

#### 5.2 索引建议

| 表 | 索引 | 用途 |
|----|------|------|
| user | uk_username | 登录时按用户名查询 |
| note | idx_user_id | 查询用户笔记列表 |
| note | idx_category_id | 按分类筛选 |
| note | idx_create_time | 按时间排序 |
| note | idx_title_content | 全文搜索（MySQL FULLTEXT） |
| category | idx_user_parent | 查询用户分类树 |
| tag | idx_user_id | 查询用户标签 |

---

### 6. API 设计概要

#### 6.1 RESTful API 端点

```
认证 (Auth)
  POST   /api/auth/register          注册
  POST   /api/auth/login             登录

用户 (User)
  GET    /api/user/profile           获取个人信息
  PUT    /api/user/profile           修改个人信息
  PUT    /api/user/password          修改密码

笔记 (Note)
  POST   /api/notes                  创建笔记
  GET    /api/notes                  笔记列表（分页+筛选）
  GET    /api/notes/{id}             笔记详情
  PUT    /api/notes/{id}             编辑笔记
  DELETE /api/notes/{id}             删除笔记（软删除）
  GET    /api/notes/search?keyword=  搜索笔记

分类 (Category)
  POST   /api/categories             创建分类
  GET    /api/categories             分类列表（树形）
  PUT    /api/categories/{id}        编辑分类
  DELETE /api/categories/{id}        删除分类

标签 (Tag)
  POST   /api/tags                   创建标签
  GET    /api/tags                   标签列表
  PUT    /api/tags/{id}              编辑标签
  DELETE /api/tags/{id}              删除标签
```

#### 6.2 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

#### 6.3 错误码

| 错误码 | 含义 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未登录 / Token 过期 |
| 403 | 无权操作 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

### 7. 前端页面规划

#### 7.1 页面清单

| 页面 | 路由 | 说明 |
|------|------|------|
| 登录页 | `/login` | 登录表单 |
| 注册页 | `/register` | 注册表单 |
| 笔记列表 | `/notes` | 左侧分类/标签筛选，右侧笔记卡片列表 |
| 笔记详情/编辑 | `/notes/:id` | 编辑笔记的富文本页面 |
| 分类管理 | `/categories` | 分类树管理 |
| 标签管理 | `/tags` | 标签列表管理 |
| 个人中心 | `/profile` | 个人信息与密码修改 |

#### 7.2 主要交互

- 笔记列表页：左侧边栏显示分类树 + 标签云，右侧显示笔记卡片（标题、摘要、时间），顶部搜索框
- 笔记编辑页：标题输入框 + 分类/标签选择器 + 富文本编辑器（推荐 Tiptap 或 Quill）

---

### 8. 非功能性需求

- **安全**：密码 BCrypt 加密、JWT 认证、SQL 注入防护（MyBatisPlus 参数化查询）、XSS 过滤
- **性能**：笔记列表分页（每页 20 条）、分类/标签缓存（本地缓存或 Redis）
- **可用性**：统一异常处理、前端 Loading 状态、空状态提示
- **扩展性**：预留 AI 集成接口（如笔记自动摘要、智能分类推荐）

---

### 9. 后续迭代规划

| 版本 | 内容 |
|------|------|
| v1.0 | 用户系统 + 笔记 CRUD + 分类 + 标签（当前版本） |
| v1.1 | 笔记 Markdown 支持 + 图片上传 |
| v1.2 | 笔记分享（生成分享链接） |
| v2.0 | AI 功能集成（RAG 检索、智能摘要、自动标签） |

---

### 10. 验证方式

1. 使用 Postman / ApiFox 测试所有 API 端点
2. 前端启动后走通完整用户流程：注册 → 登录 → 创建分类 → 创建笔记 → 搜索笔记
3. 验证权限：用户 A 无法访问用户 B 的笔记
4. 验证边界：空标题笔记、超长内容、特殊字符处理
