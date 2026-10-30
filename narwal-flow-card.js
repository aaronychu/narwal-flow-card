/* Narwal Flow Card v0.2.0 — standalone Home Assistant custom card. */
class NarwalFlowCard extends HTMLElement {
  static getConfigElement() { return document.createElement('narwal-flow-card-editor'); }
  static getStubConfig() { return {name: '云鲸 · 清洁空间', experimental_settings: false}; }

  setConfig(config) {
    this.config = {...config}; this.selected = new Set(); this.entities = {};
    this.ready = false; this.loading = false; this.busy = false;
    if (!this.shadowRoot) this.attachShadow({mode:'open'});
    this.render();
  }
  set hass(hass) {
    this._hass = hass;
    if (!this.ready && !this.loading) this.discover();
    this.render();
  }
  getCardSize() { return 10; }
  async discover() {
    this.loading = true;
    try {
      const registry = await this._hass.callWS({type:'config/entity_registry/list'});
      const vacuums = registry.filter(e => e.platform === 'narwal_r' && e.entity_id.startsWith('vacuum.') && !e.disabled_by);
      const vacuum = this.config.entity ? registry.find(e => e.entity_id === this.config.entity) : vacuums.length === 1 ? vacuums[0] : null;
      if (!vacuum) throw new Error('请在卡片配置中填写 entity: vacuum.你的机器人实体ID');
      this.entities.vacuum = vacuum.entity_id;
      const keys = ['battery','charging_state','cleaning_area','cleaning_time','map','cleaning_mode','suction_level','mop_humidity','wash_mop','dry_mop','empty_dustbin','locate'];
      for (const key of keys) {
        const entry = registry.find(e => e.device_id === vacuum.device_id && e.platform === 'narwal_r' && !e.disabled_by && (e.unique_id.endsWith('_'+key) || e.translation_key === key));
        if (entry) this.entities[key] = entry.entity_id;
      }
      Object.assign(this.entities, this.config.entities || {});
      this.ready = true; this.message = '';
    } catch (error) { this.message = error.message || String(error); }
    finally { this.loading = false; this.render(); }
  }
  escape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  state(key) { return this._hass?.states[this.entities[key]]; }
  value(key) {
    const s = this.state(key);
    return !s || ['unknown','unavailable'].includes(s.state) ? '—' : `${s.state}${s.attributes.unit_of_measurement || ''}`;
  }
  async call(domain, service, entity, data={}) {
    if (this.busy || !entity) return;
    this.busy = true; this.message = ''; this.render();
    try {
      await this._hass.callService(domain, service, {...data,entity_id:entity});
      this.message = '指令已提交，请以机器人实际状态为准';
    } catch (error) { this.message = `执行失败：${error.message || error}`; }
    finally { this.busy = false; this.render(); }
  }
  render() {
    if (!this.shadowRoot || !this.config) return;
    const esc = v => this.escape(v);
    const rooms = this.config.rooms || [];
    const status = this.state('vacuum')?.state;
    const offline = !status || ['unavailable','unknown'].includes(status);
    const locked = this.busy || offline;
    const names = {docked:'基站待命',idle:'空闲中',cleaning:'正在清洁',paused:'已暂停',returning:'返回基站',error:'设备异常',unavailable:'设备离线'};
    const modeNames = {sweep:'扫地',mop:'拖地',sweep_and_mop:'扫拖同时',sweep_then_mop:'先扫后拖'};
    const optionNames = {quiet:'降噪',standard:'标准',strong:'强劲',max:'超强',dry:'略干',normal:'标准',wet:'略湿'};
    const button = (id, label, icon, disabled=false, active=false) => `<button data-id="${esc(id)}" ${disabled?'disabled':''} class="${active?'active':''}"><ha-icon icon="mdi:${icon}"></ha-icon><span>${esc(label)}</span></button>`;
    const camera = this.state('map');
    this.shadowRoot.innerHTML = `<style>
      :host{display:block}*{box-sizing:border-box}ha-card{overflow:hidden;border:1px solid #e5e7ef;border-radius:28px;background:#f8f9fc;color:#282b3b;font-family:inherit;box-shadow:0 8px 32px #30375909}header{padding:26px 24px 16px;display:flex;justify-content:space-between;align-items:center}h1{font-size:25px;letter-spacing:-.7px;margin:4px 0 8px}.eyebrow{font-size:10px;letter-spacing:3px;color:#777e96}.status{font-size:13px;color:#73798b}.battery{background:#fff;border:1px solid #e9ebf4;border-radius:24px;padding:9px 12px;font-size:13px;color:#586678}.map{margin:0 14px;border-radius:22px;background:linear-gradient(135deg,#edf0ff,#f5f8fa);min-height:220px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}.map img{display:block;width:100%;max-height:420px;object-fit:contain}.empty{padding:42px 20px;text-align:center;color:#7b8196;font-size:13px}.map-label{position:absolute;left:14px;bottom:12px;background:#ffffffdf;padding:6px 10px;border-radius:12px;font-size:11px;color:#727b94}.metrics{display:flex;justify-content:space-around;padding:20px 8px;border-bottom:1px solid #e9ebf2}.metric{text-align:center;font-size:18px;font-weight:600}.metric small{display:block;font-size:11px;font-weight:400;color:#8a90a0;margin-top:5px}section{padding:18px 20px 0}h2{font-size:14px;margin:0 0 12px;display:flex;justify-content:space-between;align-items:center}h2 small{font-size:11px;font-weight:400;color:#969bad}.grid{display:grid;gap:8px;grid-template-columns:repeat(4,minmax(0,1fr))}button{min-width:0;cursor:pointer;border:1px solid #e6e8f1;background:#fff;color:#747b8e;border-radius:17px;padding:14px 4px;font:inherit;font-size:12px;display:flex;flex-direction:column;align-items:center;gap:7px;transition:background .18s,transform .18s}button:active{transform:scale(.97)}button:focus-visible{outline:2px solid #6476ff;outline-offset:2px}button.active{background:#e6e9ff;border-color:#d8deff;color:#6070ef}button:disabled{cursor:default;opacity:.5}ha-icon{--mdc-icon-size:22px}.note{font-size:11px;line-height:1.7;color:#969bad;margin:10px 0 0}.controls{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}.controls button{background:transparent;border:0;padding:8px 0}.footer{padding:20px}.start{width:100%;border:0;background:#6675f5;color:#fff;border-radius:22px;flex-direction:row;justify-content:center;font-size:15px;font-weight:600;padding:17px;box-shadow:0 8px 18px #6475f52b}.message{font-size:12px;line-height:1.6;color:#776b93;padding:0 20px 16px;overflow-wrap:anywhere}.retry{font-size:12px;margin:12px 20px}.repeat{display:flex;gap:8px}.repeat button{flex:1;align-items:flex-start;padding:12px}.repeat span{font-size:11px}.badge{font-size:10px;color:#959bad}select{width:100%;padding:11px;border:1px solid #e5e8f0;border-radius:12px;background:white;color:#555;font:inherit}.options{display:grid;grid-template-columns:1fr 1fr;gap:12px}.options label{font-size:12px;color:#858b9e}.options select{margin-top:7px;font-size:12px}
    </style><ha-card>
      <header><div><div class="eyebrow">NARWAL / FLOW AX12</div><h1>${esc(this.config.name || '云鲸 · 清洁空间')}</h1><div class="status">● ${esc(names[status] || status || '正在连接')}</div></div><div class="battery">${esc(this.value('battery'))} ⚡</div></header>
      <div class="map">${camera?.attributes.entity_picture ? `<img src="${esc(camera.attributes.entity_picture)}" alt="机器人清洁地图"><div class="map-label">清洁地图 · 点击查看</div>` : '<div class="empty">等待设备地图<br><br>请确认机器人在线且已有保存的地图</div>'}</div>
      <div class="metrics"><div class="metric">${esc(this.value('cleaning_area'))}<small>本次清扫面积</small></div><div class="metric">${esc(this.value('cleaning_time'))}<small>本次清扫时长</small></div><div class="metric">${esc(this.value('charging_state'))}<small>充电状态</small></div></div>
      <section><h2>清洁区域 <small>${this.selected.size ? `已选 ${this.selected.size} 个区域` : '全屋清洁'}</small></h2><div class="grid">${button('all','全屋','floor-plan',false,!this.selected.size)}${rooms.map((r,i)=>button('room:'+i,r.name,'home-outline',false,this.selected.has(r.area_id))).join('')}</div>${!rooms.length?'<p class="note">添加 rooms 配置并完成 HA 房间映射后，即可多选清洁区域。</p>':''}</section>
      <section><h2>清洁模式 <small>当前状态 · 本地写入未确认</small></h2><div class="grid">${Object.entries(modeNames).map(([k,v])=>button('mode:'+k,v,k==='mop'?'water-outline':'broom',!this.config.experimental_settings || locked,this.state('cleaning_mode')?.state===k)).join('')}</div></section>
      <section><h2>清洁次数 <small>集成暂未提供次数接口</small></h2><div class="repeat">${button('repeat1','1 次','numeric-1',true)}${button('repeat2','2 次','numeric-2',true)}${button('repeat3','3 次','numeric-3',true)}</div></section>
      <section><div class="options">${['suction_level','mop_humidity'].map(key=>`<label>${key==='suction_level'?'扫地吸力':'拖地湿度'}<select data-setting="${key}" ${!this.config.experimental_settings || locked || !this.state(key)?'disabled':''}>${!this.state(key)?'<option>未发现实体</option>':(this.state(key).attributes.options || []).map(o=>`<option value="${esc(o)}" ${this.state(key).state===o?'selected':''}>${esc(optionNames[o] || o)}</option>`).join('')}</select></label>`).join('')}</div><p class="note">${this.config.experimental_settings?'已开启实验设置；写入是否生效请在机器人端确认。':'吸力与湿度写入待验证，默认只展示设备上报状态。'}</p></section>
      <section><h2>基站维护</h2><div class="grid">${[['wash_mop','洗拖布','waves'],['dry_mop','烘拖布','weather-sunny'],['empty_dustbin','集尘','delete-empty-outline'],['locate','找机器','map-marker-radius-outline']].map(([k,n,i])=>button('dock:'+k,n,i,locked || !this.entities[k])).join('')}</div></section>
      <div class="footer"><button class="start" data-id="start" ${locked?'disabled':''}><ha-icon icon="mdi:play"></ha-icon>${this.busy?'正在提交…': status==='paused'?'继续当前清洁':this.selected.size?`开始清洁 · ${this.selected.size} 个区域`:'开始全屋清洁'}</button><div class="controls">${button('pause','暂停','pause',locked)}${button('return','回充','home-import-outline',locked)}${button('stop','停止','stop',locked)}${button('refresh','刷新','refresh',this.busy)}</div></div>
      ${this.message?`<div role="status" class="message">${esc(this.message)}</div>`:''}
      ${!this.ready&&!this.loading?'<button class="retry" data-id="refresh">重新识别设备</button>':''}
    </ha-card>`;
    this.shadowRoot.querySelectorAll('[data-id]').forEach(el=>el.onclick=()=>this.handle(el.dataset.id));
    this.shadowRoot.querySelectorAll('select').forEach(el=>el.onchange=()=>this.call('select','select_option',this.entities[el.dataset.setting],{option:el.value}));
    const map = this.shadowRoot.querySelector('.map');
    map.onclick=()=> { if (this.entities.map) this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:this.entities.map},bubbles:true,composed:true})); };
  }
  handle(id) {
    const vacuum = this.entities.vacuum;
    if(id==='all') { this.selected.clear(); this.render(); return; }
    if(id.startsWith('room:')) { const room=this.config.rooms[Number(id.split(':')[1])]; this.selected.has(room.area_id)?this.selected.delete(room.area_id):this.selected.add(room.area_id); this.render(); return; }
    if(id==='refresh') { this.ready=false; this.discover(); return; }
    if(id.startsWith('mode:')) { if(this.config.experimental_settings) this.call('select','select_option',this.entities.cleaning_mode,{option:id.split(':')[1]}); return; }
    if(id.startsWith('dock:')) { this.call('button','press',this.entities[id.split(':')[1]]); return; }
    if(id==='start') {
      if(this.state('vacuum')?.state==='paused') { this.call('vacuum','start',vacuum); return; }
      if(this.selected.size) this.call('vacuum','clean_area',vacuum,{cleaning_area_id:[...this.selected]});
      else this.call('vacuum','start',vacuum);
      return;
    }
    const actions={pause:'pause',return:'return_to_base',stop:'stop'};
    if(actions[id]) this.call('vacuum',actions[id],vacuum);
  }
}
if (!customElements.get('narwal-flow-card')) customElements.define('narwal-flow-card',NarwalFlowCard);
window.customCards = window.customCards || [];
window.customCards.push({type:'narwal-flow-card',name:'Narwal Flow 清洁空间',description:'云鲸地图、区域多选和基站控制',documentationURL:'https://github.com/aaronychu/narwal-flow-card'});

class NarwalFlowCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.areas = [];
    this.registry = [];
  }
  setConfig(config) {
    this.config = {...config, rooms: (config.rooms || []).map(room => ({...room}))};
    this.render();
  }
  set hass(hass) {
    this._hass = hass;
    if (!this.loaded && !this.loading) this.loadOptions();
  }
  async loadOptions() {
    this.loading = true;
    const results = await Promise.allSettled([
      this._hass.callWS({type: 'config/area_registry/list'}),
      this._hass.callWS({type: 'config/entity_registry/list'})
    ]);
    if (results[0].status === 'fulfilled') this.areas = results[0].value;
    if (results[1].status === 'fulfilled') this.registry = results[1].value;
    this.loadError = results.some(result => result.status === 'rejected');
    this.loading = false;
    this.loaded = true;
    this.render();
  }
  escape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  update(patch) {
    this.config = {...this.config, ...patch};
    for (const key of Object.keys(this.config)) if (this.config[key] === undefined) delete this.config[key];
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: {config: {...this.config, rooms: this.config.rooms.map(room => ({...room}))}},
      bubbles: true, composed: true
    }));
  }
  changeRoom(index, patch) {
    const rooms = this.config.rooms.map((room, i) => i === index ? {...room, ...patch} : {...room});
    if (patch.area_id) {
      // A duplicate area would make two buttons toggle the same selection.
      if (rooms.some((room, i) => i !== index && room.area_id === patch.area_id)) {
        this.error = '这个 HA 区域已经添加，请选择其他区域。'; this.render(); return;
      }
    }
    this.error = '';
    this.update({rooms});
    this.render();
  }
  addRoom() {
    const area = this.areas.find(item => !this.config.rooms.some(room => room.area_id === item.area_id));
    if (!area) return;
    this.update({rooms: [...this.config.rooms, {name: area.name, area_id: area.area_id}]});
    this.render();
  }
  removeRoom(index) {
    this.update({rooms: this.config.rooms.filter((_, i) => i !== index)});
    this.render();
  }
  render() {
    if (!this.config) return;
    const esc = value => this.escape(value);
    const selectedVacuum = this.registry.find(item => item.entity_id === this.config.entity);
    const vacuums = this.registry.filter(item => item.entity_id.startsWith('vacuum.') && item.platform === 'narwal_r' && !item.disabled_by);
    const fields = {
      battery:['电池','sensor'],charging_state:['充电状态','sensor'],cleaning_area:['清扫面积','sensor'],
      cleaning_time:['清扫时间','sensor'],map:['地图','camera'],cleaning_mode:['清洁模式','select'],
      suction_level:['吸力等级','select'],mop_humidity:['拖地湿度','select'],wash_mop:['清洗拖布','button'],
      dry_mop:['烘干拖布','button'],empty_dustbin:['清空尘盒','button'],locate:['寻找机器人','button']
    };
    const areaOptions = (value) => {
      const items = [...this.areas];
      if (value && !items.some(area => area.area_id === value)) items.push({area_id:value,name:`${value}（未找到区域）`});
      return items.map(area => `<option value="${esc(area.area_id)}" ${area.area_id === value?'selected':''}>${esc(area.name)} · ${esc(area.area_id)}</option>`).join('');
    };
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;color:var(--primary-text-color);font-family:inherit}*{box-sizing:border-box}.form{display:grid;gap:18px;padding:4px 0 16px}label{display:grid;gap:7px;font-size:13px}input,select{width:100%;min-width:0;font:inherit;color:var(--primary-text-color);background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#ddd);border-radius:10px;padding:11px}input:focus-visible,select:focus-visible,button:focus-visible{outline:2px solid var(--primary-color,#6675f5);outline-offset:2px}h3{font-size:15px;margin:0}p{font-size:12px;line-height:1.7;color:var(--secondary-text-color);margin:8px 0}.room{display:grid;grid-template-columns:minmax(90px,1fr) minmax(110px,1.4fr) auto;gap:8px;align-items:end;padding:12px 0;border-bottom:1px solid var(--divider-color,#eee)}button{cursor:pointer;border:1px solid var(--divider-color,#ddd);background:var(--card-background-color,#fff);color:var(--primary-color,#6675f5);padding:11px;border-radius:10px;font:inherit}button:disabled{opacity:.5;cursor:default}.add{margin-top:12px}.toggle{display:flex;align-items:center;gap:10px}.toggle input{width:18px;height:18px}.advanced{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}summary{cursor:pointer;font-size:14px}.error{color:var(--error-color,#b33)}.info{border-radius:12px;padding:12px;background:var(--secondary-background-color,#f5f6fa)}@media(max-width:420px){.room{grid-template-columns:1fr auto}.room label:first-child{grid-column:1/-1}.advanced{grid-template-columns:1fr}}
    </style><div class="form">
      <label>卡片名称<input id="name" type="text" value="${esc(this.config.name || '')}" placeholder="云鲸 · 清洁空间"></label>
      <label>扫地机器人<input id="entity" type="text" list="vacuums" value="${esc(this.config.entity || '')}" placeholder="留空：自动识别唯一的云鲸设备"><datalist id="vacuums">${vacuums.map(item=>`<option value="${esc(item.entity_id)}">${esc(this._hass?.states[item.entity_id]?.attributes.friendly_name || item.entity_id)}</option>`).join('')}</datalist></label>
      <section><h3>清洁房间</h3><p>选择 HA 区域，并自定义卡片上的房间名称。请先在机器人实体设置中完成「分区映射到区域」。地图里的机器人房间 ID 不能直接填入这里。</p>
      ${this.config.rooms.map((room,index)=>`<div class="room"><label>显示名称<input data-room-name="${index}" value="${esc(room.name)}"></label><label>HA 区域<select data-room-area="${index}">${areaOptions(room.area_id)}</select></label><button data-remove="${index}" aria-label="删除${esc(room.name)}">删除</button></div>`).join('')}
      <button id="add" class="add" ${!this.areas.some(area=>!this.config.rooms.some(room=>room.area_id===area.area_id))?'disabled':''}>＋ 添加房间</button>
      ${!this.areas.length?'<p>正在读取区域，或当前没有可用区域。请先在 HA 中创建区域后点击重新读取。</p>':''}
      ${this.error?`<p class="error" role="alert">${esc(this.error)}</p>`:''}</section>
      <section><label class="toggle"><input id="experimental" type="checkbox" ${this.config.experimental_settings?'checked':''}>启用实验控制</label><p>允许操作清洁模式、吸力和拖地湿度。集成本地写入尚未全部验证；开启后需确认机器人实际响应。此开关不会启用清洁次数。</p></section>
      <details><summary>高级：手动指定关联实体</summary><p>通常自动识别即可。留空表示自动识别；仅在识别错误时指定。</p><div class="advanced">${Object.entries(fields).map(([key,[name,domain]])=>`<label>${name}<input data-override="${key}" list="options-${key}" value="${esc(this.config.entities?.[key] || '')}" placeholder="自动识别"><datalist id="options-${key}">${Object.keys(this._hass?.states || {}).filter(id=>id.startsWith(domain+'.') && (!selectedVacuum || this.registry.some(item=>item.entity_id===id && item.device_id===selectedVacuum.device_id))).map(id=>`<option value="${esc(id)}">${esc(this._hass.states[id].attributes.friendly_name || id)}</option>`).join('')}</datalist></label>`).join('')}</div></details>
      <div class="info"><p>未配置房间时执行全屋清洁。清洁次数由后端集成能力决定，目前不支持设置。</p>${this.loadError?'<p class="error">区域或实体列表读取失败，请使用管理员账号检查权限后重新读取。</p>':''}<button id="reload">重新读取区域和实体</button></div>
    </div>`;
    const root = this.shadowRoot;
    root.getElementById('name').onchange = event => this.update({name: event.target.value.trim() || undefined});
    root.getElementById('entity').onchange = event => {
      const entity = event.target.value.trim();
      if (entity && !entity.startsWith('vacuum.')) { event.target.setCustomValidity('请选择 vacuum 域的机器人实体'); event.target.reportValidity(); return; }
      event.target.setCustomValidity(''); this.update({entity: entity || undefined});
    };
    root.getElementById('experimental').onchange = event => this.update({experimental_settings:event.target.checked});
    root.getElementById('add').onclick = () => this.addRoom();
    root.getElementById('reload').onclick = () => { if (!this.loading) this.loadOptions(); };
    root.querySelectorAll('[data-room-name]').forEach(input => input.onchange = () => this.changeRoom(Number(input.dataset.roomName),{name:input.value.trim() || this.config.rooms[Number(input.dataset.roomName)].area_id}));
    root.querySelectorAll('[data-room-area]').forEach(select => select.onchange = () => this.changeRoom(Number(select.dataset.roomArea),{area_id:select.value}));
    root.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => this.removeRoom(Number(button.dataset.remove)));
    root.querySelectorAll('[data-override]').forEach(input => input.onchange = () => {
      const entities = {...this.config.entities};
      if (input.value.trim()) entities[input.dataset.override] = input.value.trim();
      else delete entities[input.dataset.override];
      this.update({entities:Object.keys(entities).length?entities:undefined});
    });
  }
}
if (!customElements.get('narwal-flow-card-editor')) customElements.define('narwal-flow-card-editor',NarwalFlowCardEditor);
