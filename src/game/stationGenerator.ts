import type { StationRoom } from './types';

export function generateStation(): StationRoom[] {
  const rooms: StationRoom[] = [
    { id:'entrance', type:'entrance', name:'入口舱', description:'气密门仍维持着微弱电力。', connectedRoomIds:['storage','engineering'], visited:true, cleared:true, x:9, y:50 },
    { id:'storage', type:'storage', name:'储藏间', description:'散落的货箱等待扫描。', connectedRoomIds:['entrance','memory'], visited:false, cleared:false, x:30, y:24 },
    { id:'engineering', type:'engineering', name:'维修室', description:'自动维修臂冻结在半空。', connectedRoomIds:['entrance','combat'], visited:false, cleared:false, x:30, y:76 },
    { id:'memory', type:'memory', name:'记忆舱', description:'一枚残缺晶片发出低频脉冲。', connectedRoomIds:['storage','control'], visited:false, cleared:false, x:53, y:24 },
    { id:'combat', type:'combat', name:'防卫舱', description:'旧式安保系统仍处于激活状态。', connectedRoomIds:['engineering','control'], visited:false, cleared:false, x:53, y:76 },
    { id:'control', type:'control', name:'控制室', description:'星图终端指向最深处的核心。', connectedRoomIds:['memory','combat','core'], visited:false, cleared:false, x:74, y:50 },
    { id:'core', type:'core', name:'核心舱', description:'主能源核心与 Nova 的信号产生共振。', connectedRoomIds:['control'], visited:false, cleared:false, x:94, y:50 }
  ];
  return rooms;
}
