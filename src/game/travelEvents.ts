import type { EventChoice, PlayerResources, StarNode } from './types';

const pick=<T,>(items:T[])=>items[Math.floor(Math.random()*items.length)];

export function maybeCreateTravelEvent(node: StarNode, sector: number, resources: PlayerResources): EventChoice | undefined {
  if (!['salvage','anomaly','story'].includes(node.type) || Math.random() > 0.78) return undefined;
  const id=`${node.type}-${node.id}-${Date.now()}`;
  if(node.type==='salvage') return pick<EventChoice>([
    {
      id,title:'残骸云内的未熄反应堆',text:'低温反应堆仍在缓慢呼吸。拆解最稳妥，重新点火则可能换来一笔星港汇票。',
      options:[
        {id:'alloy',label:'稳妥拆解',description:`获得 ${8+sector} 合金。`},
        {id:'credits',label:'脉冲点火',description:'消耗 4 合金，换取信用点。',disabledReason:resources.alloy<4?'合金不足 4':''}
      ]
    },
    {
      id,title:'失控的维修蜂群',text:'一群维修无人机仍守着早已不存在的母舰。它们接受合金，也可能被改写为临时维修队。',
      options:[
        {id:'drone-salvage',label:'回收蜂群',description:'拆成大量合金与可兑现组件。'},
        {id:'drone-repair',label:'重写协议',description:'消耗 5 合金修复舰体。',disabledReason:resources.alloy<5?'合金不足 5':''}
      ]
    },
    {
      id,title:'漂流货柜的双重封条',text:'货柜一半标着军械编号，一半覆盖着私人航运公司的蜡封。撬开哪一侧都会让另一侧自毁。',
      options:[
        {id:'cargo-armory',label:'开启军械侧',description:'获得随机装置，但消耗 5 合金。',disabledReason:resources.alloy<5?'合金不足 5':''},
        {id:'cargo-civilian',label:'开启民用侧',description:'获得信用点与燃料。'}
      ]
    }
  ]);
  if(node.type==='anomaly') return pick<EventChoice>([
    {
      id,title:'折叠信标的回声',text:'异常信号正在重复一段不存在的航迹。记忆碎片可以稳定它，也可以回收其中的稀有合金。',
      options:[
        {id:'energy',label:'回收辉晶',description:`获得 ${5+sector} 合金与少量信用点。`},
        {id:'memory-scan',label:'记忆校准',description:'消耗 1 记忆，析出高阶装置。',disabledReason:resources.memoryFragments<1?'记忆不足 1':''}
      ]
    },
    {
      id,title:'静止在舷窗外的闪电',text:'一道紫色闪电跟随飞船，却没有发生任何位移。护盾和驾驶员都在听见它的低语。',
      options:[
        {id:'phase-shield',label:'引入护盾',description:'消耗 4 合金，完全恢复护盾。',disabledReason:resources.alloy<4?'合金不足 4':''},
        {id:'phase-listen',label:'保持倾听',description:'驾驶员获得同步经验与记忆碎片。'}
      ]
    },
    {
      id,title:'倒流的微型彗星',text:'冰尘从尾迹回到彗核，时间在它附近反向滑行。可以截取物质，也可以让扫描阵列记录这段倒流。',
      options:[
        {id:'comet-alloy',label:'截取彗核',description:'获得大量合金，舰体承受轻微损伤。'},
        {id:'comet-record',label:'记录倒流',description:'获得记忆碎片和扫描收益。'}
      ]
    }
  ]);
  return pick<EventChoice>([
    {
      id,title:'旧日航标的私人频段',text:'航标没有求救，只是在循环一段舰队私语。你可以保存它，也可以把它卖给补给站。',
      options:[
        {id:'memory',label:'保存频段',description:'获得记忆碎片与同步经验。'},
        {id:'sell-memory',label:'出售频段',description:'消耗 1 记忆，换取信用点。',disabledReason:resources.memoryFragments<1?'记忆不足 1':''}
      ]
    },
    {
      id,title:'休眠舱里的陌生坐标',text:'休眠舱已经空了，内壁却刻着一组仍在更新的坐标。附近拾荒者愿意购买，也有人在等待它被送回。',
      options:[
        {id:'rescue-signal',label:'转发坐标',description:'消耗 45 信用点，获得合金与同步经验。',disabledReason:resources.credits<45?'信用点不足 45':''},
        {id:'sell-coordinates',label:'卖给拾荒者',description:'立即获得信用点。'}
      ]
    },
    {
      id,title:'会唱歌的观测档案',text:'档案中的恒星频谱被编成了一首没有歌词的歌。保存原件需要合金重建存储外壳。',
      options:[
        {id:'archive-song',label:'重建档案',description:'消耗 6 合金，获得 2 枚记忆碎片。',disabledReason:resources.alloy<6?'合金不足 6':''},
        {id:'broadcast-song',label:'公开广播',description:'获得少量信用点与驾驶员同步经验。'}
      ]
    }
  ]);
}
