
const { ccclass, property } = cc._decorator;

//初始化对象池的大小
const MAXN: number = 50;

@ccclass
export class Pool extends cc.Component {

    public static GridPool: cc.NodePool = new cc.NodePool();

    //初始化结点池
    public static initNodePool(pre: cc.Prefab): void {
        for (let i = 0; i < MAXN; i++) {
            Pool.GridPool.put(cc.instantiate(pre));
        }
    }
    //取结点
    public static getNode(pre: cc.Prefab): cc.Node{
        let nd: cc.Node = null;
        if (Pool.GridPool.size() > 0) {
            nd = Pool.GridPool.get();
        } else {
            nd = cc.instantiate(pre);
        }
        return nd;
    }
}
