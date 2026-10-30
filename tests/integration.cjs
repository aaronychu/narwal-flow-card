const {parseHTML}=require('linkedom');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {window}=parseHTML('<html><body></body></html>');
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../narwal-flow-card.js'),'utf8'),{window,document:window.document,HTMLElement:window.HTMLElement,customElements:window.customElements,CustomEvent:window.CustomEvent});
const settle=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const registry=[{entity_id:'vacuum.flow',platform:'narwal',device_id:'a',unique_id:'AX12'},...['map_hd','clean_mode','charging_state','battery','mop_humidity','wash_mop'].map(k=>({entity_id:(k==='map_hd'?'camera':k==='clean_mode'||k==='mop_humidity'?'select':k==='wash_mop'?'button':'sensor')+'.'+k,platform:'narwal',device_id:'a',unique_id:'AX12_'+k}))];
 const states={'vacuum.flow':{state:'docked',attributes:{fan_speed_list:['quiet','normal','strong','max']}},'camera.map_hd':{state:'idle',attributes:{rooms:{'1':{name:'客厅'},'4':{name:'主卧'}},entity_picture:'/api/camera_proxy/camera.map_hd?token=example'}},'select.clean_mode':{state:'sweep_mop',attributes:{options:['sweep','mop','sweep_mop','sweep_then_mop']}},'select.mop_humidity':{state:'unknown',attributes:{options:['dry','normal','wet']}}};
 const calls=[];const hass={states,callWS:async({type})=>type.includes('entity_registry')?registry:[],callService:async(...args)=>{calls.push(args)}};
 const c=window.document.createElement('narwal-flow-card');c.setConfig({type:'custom:narwal-flow-card',experimental_settings:false});c.hass=hass;await settle();
 assert.equal(c.platform,'narwal');assert.equal(c.entities.map,'camera.map_hd');assert.equal(c.entities.cleaning_mode,'select.clean_mode');assert.equal(c.availableRooms().length,2);
 assert(!c.shadowRoot.querySelector('[data-id="mode:sweep_mop"]').disabled);
 assert(c.shadowRoot.innerHTML.includes('尚无已设定值'));
 c.handle('room:1');c.handle('start');await settle();assert.equal(calls[0][0],'narwal');assert.equal(calls[0][1],'clean_rooms');assert.equal(calls[0][2].rooms[0],4);
 c.handle('mode:sweep_then_mop');await settle();assert.equal(calls[1][2].option,'sweep_then_mop');
 await c.setting('suction_level','strong');assert.equal(calls[2][1],'set_fan_speed');assert.equal(calls[2][2].fan_speed,'strong');
 c.handle('dock:locate');await settle();assert.equal(calls[3][0],'vacuum');assert.equal(calls[3][1],'locate');
 states['vacuum.flow'].state='idle';const count=calls.length;c.handle('start');await settle();assert.equal(calls.length,count);assert(c.message.includes('基站'));
 // Remapping removes stale selected IDs instead of sending obsolete room IDs.
 states['camera.map_hd'].attributes.rooms={'7':{name:'新客厅'}};c.hass=hass;assert.equal(c.selected.size,0);
 const editor=window.document.createElement('narwal-flow-card-editor');editor.setConfig({type:'custom:narwal-flow-card',rooms:[{name:'旧区域',area_id:'old_area'}]});editor.hass=hass;await settle();
 assert.equal(editor.mapRooms()[0].room_id,7);assert(!editor.shadowRoot.getElementById('add'));
 editor.changeRobotRoom(0,'新名字');assert.equal(editor.config.robot_rooms[0].name,'新名字');assert.equal(editor.config.rooms[0].area_id,'old_area');
 editor.removeRobotRoom(0);assert.equal(editor.robotRooms().length,0);editor.shadowRoot.getElementById('auto-rooms').click();assert.equal(editor.robotRooms().length,1);
 // Backwards compatibility: narwal_r still sends HA area ids and keeps modes gated.
 const old=window.document.createElement('narwal-flow-card');old.setConfig({rooms:[{name:'客厅',area_id:'living'}]});
 const oldCalls=[];old.hass={states:{'vacuum.old':{state:'docked',attributes:{}}},callWS:async()=>[{entity_id:'vacuum.old',device_id:'old',platform:'narwal_r',unique_id:'old'}],callService:async(...args)=>oldCalls.push(args)};await settle();
 old.handle('room:0');old.handle('start');await settle();assert.equal(oldCalls[0][1],'clean_area');assert.equal(oldCalls[0][2].cleaning_area_id[0],'living');assert.equal(Boolean(old.controlEnabled()),false);
 console.log('通过：narwal 自动实体识别、HD 地图房间、多选服务下发、模式枚举、吸力服务、寻找、停靠要求、重新建图选择清理、可视化改名/删除/恢复、narwal_r 兼容。');
})().catch(e=>{console.error(e);process.exitCode=1});
