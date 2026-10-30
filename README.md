# Narwal Flow Card · 清洁空间

一张独立的 Home Assistant 自定义卡片，采用接近云鲸 App 的浅色蓝紫色样式。无需 Mushroom / button-card / card-mod。

## HACS 安装（推荐）

1. 打开 HACS → 右上角菜单 → 自定义存储库。
2. 添加 `https://github.com/aaronychu/narwal-flow-card`，类别选择 **Dashboard（仪表盘）**；旧版可能显示 Lovelace / Plugin。
3. 搜索 Narwal Flow 清洁空间并下载，刷新浏览器。
4. 检查「设置 → 仪表盘 → 资源」是否已有 JavaScript 模块 `/hacsfiles/narwal-flow-card/narwal-flow-card.js`；如果没有则手动添加。不要同时加载手动安装的 `/local/` 版本。
5. 编辑仪表盘 → 添加卡片 → 手动，粘贴 `examples/card.yaml`。

这是 HACS 自定义仓库，尚未进入 HACS 默认商店列表；需先手动添加仓库。后端 `rudyll/narwal_r` 集成仍需单独安装。

## 手动安装

1. 把 `narwal-flow-card.js` 上传到 Home Assistant 的 `/config/www/narwal-flow-card.js`。没有 www 目录则新建。
2. 「设置 → 仪表盘 → 右上角菜单 → 资源」添加：
   - URL：`/local/narwal-flow-card.js?v=1`
   - 类型：JavaScript 模块。
   若看不到资源管理，先在个人资料中开启高级模式。
3. 刷新浏览器；手机 App 必要时清除前端缓存。
4. 「编辑仪表盘 → 添加卡片 → 手动」，粘贴 `examples/card.yaml` 内容。
5. 用管理员账号首次设置。卡片需要读取实体注册表来识别关联实体。如果有多个 narwal_r 机器人，需要填写真实的 `entity`。

你给出的表格是实体显示名称，没有包含实体 ID。卡片会依据设备关联关系及 unique_id 自动寻找相关实体，并不根据显示名称猜 ID。若某个实体识别失败，可以显式覆盖：

```yaml
entities:
  battery: sensor.真实电池ID
  charging_state: sensor.真实充电状态ID
  cleaning_area: sensor.真实清扫面积ID
  cleaning_time: sensor.真实清扫时间ID
  map: camera.真实地图ID
  cleaning_mode: select.真实清洁模式ID
  suction_level: select.真实吸力ID
  mop_humidity: select.真实湿度ID
  wash_mop: button.真实清洗ID
  dry_mop: button.真实烘干ID
  empty_dustbin: button.真实集尘ID
  locate: button.真实寻找ID
```

## 设置可选房间

使用较新的 narwal_r 集成与 HA 2026.3 或更高版本（集成源码对 Segment API 的要求）。

1. 在 HA「设置 → 区域、标签和地带」建立客厅、餐厅、厨房、主卧等区域。
2. 「设置 → 设备与服务 → 实体」打开机器人 vacuum 实体，进入设置，找到「将吸尘器分区映射到区域」，把机器人地图里的房间关联到 HA 区域。
3. 在卡片 YAML 的 rooms 中填入这些 HA 区域 ID。它们不是机器人地图 room_id，也不是房间的中文显示名称。可在开发者工具模板中用 `{{ areas() }}` 查看所有区域 ID，用 `{{ area_name('区域ID') }}` 核对名称。
4. 点击卡片房间按钮进行多选，再点开始。点击「全屋」清除房间选择。

卡片使用 `vacuum.clean_area`，以 `cleaning_area_id` 下发已映射的 HA 区域 ID。若未映射，HA 会拒绝或不能正确解析该区域。请先只配置一个房间，实际确认运行目标正确后再添加其他房间。

地图来自集成的 camera 实体，可点击放大。它不是官方 App 的 3D 地图，不支持在地图上拖框划区。本卡片在 HA 状态更新时更新地图图片。

## 模式、吸力、湿度和次数

- 默认展示清洁模式、吸力和湿度的设备状态。清洁模式本地写入未确认；吸力和湿度写入待验证。
- 若你愿意测试集成已有的写入，可在 YAML 设置 `experimental_settings: true`。此时模式按钮与吸力/湿度下拉框可操作，调用已有 `select.select_option`。服务调用返回成功只说明 HA 接受请求，请以设备端实际变化为准；集成可能捕获错误并只记录日志。
- 扫地次数、拖地次数当前没有对应实体及已核实的下发接口，卡片明确禁用这些按钮。要实现 App 中的「扫 2 次 / 拖 3 次」或可靠切换「先扫后拖」，需要先扩展集成并验证机器人的协议。重复发送开始命令不能等同于设定次数。
- 「继续当前清洁」恢复暂停的任务，不会按新选房间重建任务。
- 基站操作按当前设备实体调用，是否生效取决于设备和集成实现。

## 验证范围

已检查 JavaScript 语法，并用模拟 HA 验证实体归属识别、房间多选下发、暂停恢复及服务错误处理。没有连接你的 Home Assistant 或机器人，尚未进行实机和真实 HA 界面验证。

来源：
- https://github.com/rudyll/narwal_r
- https://github.com/rudyll/narwal_r/blob/main/custom_components/narwal_r/vacuum.py
- https://www.home-assistant.io/integrations/vacuum/


本项目为独立的社区前端卡片，配合 narwal_r 集成使用，与云鲸官方无关联。
