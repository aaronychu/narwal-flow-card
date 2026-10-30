# Narwal Flow Card · 清洁空间

面向云鲸 Narwal Flow AX12 的独立 Home Assistant 自定义卡片：高清地图、房间多选、清洁模式、吸力、拖地湿度、基站操作，以及可视化编辑器。无需 Mushroom / button-card / card-mod。

## 支持的后端集成

| 后端 | 卡片行为 |
| --- | --- |
| [sytchi/NarwalIntegration](https://github.com/sytchi/NarwalIntegration)，域 `narwal` | v0.3.0 起支持。自动读取 Map HD 房间；直接调用机器人房间清扫；模式、吸力和湿度可操作 |
| [rudyll/narwal_r](https://github.com/rudyll/narwal_r)，域 `narwal_r` | 保留兼容。使用 HA 区域映射清扫，模式等设置仍按实验功能处理 |

`sytchi/NarwalIntegration` 作者以 AX12 为主要开发、测试型号，但固件差异可能影响实际行为。本卡片没有连接用户机器人实测。

## HACS 安装

1. HACS → 右上角菜单 → 自定义存储库。
2. 添加 `https://github.com/aaronychu/narwal-flow-card`，类别选择 **Dashboard（仪表盘）**；旧版可能显示 Lovelace / Plugin。
3. 搜索 Narwal Flow 清洁空间并下载最新版，刷新浏览器。
4. 检查「设置 → 仪表盘 → 资源」已有 JavaScript 模块 `/hacsfiles/narwal-flow-card/narwal-flow-card.js`；没有时手动添加。
5. 编辑仪表盘 → 添加卡片 → 找到 Narwal Flow 清洁空间，使用可视化编辑器配置。

这是 HACS 自定义仓库。后端集成需单独安装。

如果没有找到卡片，可以添加手动卡片：

```yaml
type: custom:narwal-flow-card
name: Mika 002
```

首次设置建议使用管理员账号，自动识别需读取实体注册表。只有一台受支持的云鲸设备时自动选择；多台设备请在编辑器中选定 vacuum 实体。

## AX12 配合 sytchi/NarwalIntegration 使用

1. 若目前使用 `narwal_r`，先在设备与服务中禁用旧设备的集成条目，避免两个连接争用机器人。不要把新集成文件覆盖进 `narwal_r` 目录。
2. 在 HACS 添加 `https://github.com/sytchi/NarwalIntegration`，类别 **Integration**，下载后重启 HA。
3. 设置 → 设备与服务 → 添加集成 → Narwal，按向导填写机器人 IP 和型号。
4. 关闭云鲸 App 的活动连接，唤醒机器人，确认 `camera.*_map_hd` 显示地图。
5. 更新本卡片到 v0.3.0 或更高，编辑器中选择新集成创建的 vacuum 实体。

新集成域是 `narwal`，旧集成域是 `narwal_r`，不能套用原 upstream 同域升级的迁移说明；新实体 ID 可能不同。地图在新集成 2.0 中使用 `*_map_hd`。

### 房间获取

默认直接读取关联 Map HD 摄像头的 `rooms` 属性。该属性包含机器人房间 ID 和名称，因此 **无需手动查 ID，也无需创建 HA 区域映射**。地图数据到达后，房间按钮自动出现。

可视化编辑器支持重命名、删除这些房间。第一次编辑后会保存 `robot_rooms` 自定义列表；「恢复地图自动读取」清除自定义列表并重新跟随地图。如果重新建图后房间 ID 改变，建议恢复自动读取。

未获取到房间时，请在开发者工具 → 状态中检查 Map HD 实体是否具有 `rooms` 属性，并唤醒机器人后刷新卡片。读取到的是地图已保存房间，不是 HA 中的 Living Room 设备归属区域。

多选房间后，卡片调用 `narwal.clean_rooms`，传入整数房间 ID。按后端要求，分房间启动需要机器人在基站停靠；暂停时主按钮恢复已有任务，不重新应用房间选择。

### 模式、吸力和湿度

- 模式：扫地、拖地、扫拖同时、先扫后拖。调用新集成的 `select.*_clean_mode`，存储下次任务的模式；随后点击开始时后端将模式加入启动参数。切换模式不会即时改变当前任务。
- 吸力：调用 `vacuum.set_fan_speed`。AX12 不广播实时吸力，因此显示的是 HA 最近设定值；未知时显示「尚无已设定值」，不把第一项误当当前值。
- 湿度：使用 `select.*_mop_humidity`。
- 新 `narwal` 后端不需要打开实验控制开关。该开关仅用于旧 `narwal_r` 后端。

### 次数与地图划区

新集成底层 client 有 passes 参数，但当前 HA 服务和实体没有暴露次数设置，卡片继续明确禁用次数按钮；不使用重复发送开始命令模拟次数。独立扫地/拖地次数需要先扩展、验证后端接口。

本卡片地图仅展示与点击放大，不支持拖框。新集成自身有 `narwal.clean_zone` 服务；如需要交互地图划区，可按它的 README 安装并配置 xiaomi-vacuum-map-card。2.0 的划区使用机器人世界坐标，不能直接传图片像素。

## 旧 narwal_r 后端

房间仍需使用 HA 区域映射：在 vacuum 实体设置中将机器人分区关联到 HA 区域，然后在卡片可视化编辑器添加对应区域。需要 HA 2026.3 或更新版本及支持分区的集成版本。调用 `vacuum.clean_area` 时传入 HA 区域 ID。

默认只展示模式、吸力和湿度状态。打开实验控制可调用集成已有的选择器，但写入是否生效需设备实测。

## 高级设置

可视化编辑器中展开「高级：手动指定关联实体」，覆盖自动识别失败的地图、传感器、选择器和按钮。无需猜实体名称，选用你的 HA 中实际存在的实体。

保留旧配置字段 `rooms`（HA 区域 ID）；新集成使用单独的 `robot_rooms`（机器人房间 ID），两种 ID 不混用。切换设备时编辑器会清除自定义机器人房间列表，重新读取目标设备地图。

## 更新与缓存

HACS 中更新或重新下载最新版本，刷新浏览器。若仍提示「不支持可视化编辑器」或未识别新集成，清除手机 App 前端缓存，或将资源地址改为：

`/hacsfiles/narwal-flow-card/narwal-flow-card.js?v=0.3.0`

类型为 JavaScript 模块。不要同时加载 `/local/` 手动安装版本。

## 手动安装

把 `narwal-flow-card.js` 上传至 `/config/www/`，在仪表盘资源中添加 `/local/narwal-flow-card.js?v=0.3.0`（JavaScript 模块），刷新后添加卡片。

## 验证范围

JavaScript 语法检查和模拟 DOM 测试已覆盖：编辑器配置保存与交互、转义、权限失败提示、新旧集成识别、高清地图房间读取、正确服务与模式枚举、吸力与定位调用、停靠检查、重新建图选择清理，以及旧后端区域清扫兼容。尚未连接真实 HA 和 AX12 实机验证。

本项目为独立社区卡片，与云鲸官方无关联。
