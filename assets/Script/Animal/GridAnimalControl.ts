import { GameScene } from "../GameBoard/GameScene";
import { GridAnimal } from "./GridAnimal";
import { EMPTY } from "../GameBoard/GridData";
import { ScoreTable } from "../Score/ScoreTable";

export class GridAnimalControl {

    public gridAnimalArray: cc.Node[][] = null;
    public gameScene: GameScene = null;
    public scanMaze: number[][] = null;
    public gridDismissArray: cc.Node[] = null;
    public recordArray: cc.Vec2[] = null;
    public checkMaze: boolean[][] = null;
    public centerPoint: cc.Vec2 = null;
    public gridAnimal: GridAnimal = null;
    public dismissLimit: number = 0;
    public multipleRecord: number = 0;
    public addScore: number = 0;//当前消除增加的分数

    public shiftValue: number = 0.5;//设定数组偏移值

    public toolArray: cc.Vec2[][] = null;//工具数组,用于进行偏移,专门用于计算六边形的周围格子

    //构造函数
    constructor(gameScene: GameScene) {
        this.gameScene = gameScene;
        this.init();
    }

    //初始化函数
    public init() {
        this.scanMaze = this.gameScene.position.maze;
        this.centerPoint = this.gameScene.position.sourcePos;//数组的中心点
        //记录用的数组,用于临时记录最近的一次扫描相同的方块
        this.recordArray = [];
        //用于BFS遍历时标记遍历点
        this.checkMaze = [];
        this.gridAnimalArray = [];
        this.gridDismissArray = [];
        this.toolArray = [];
        this.initArray(this.scanMaze);
        //初始化动画特效
        this.gridAnimal = new GridAnimal(this);
        this.gridAnimal.init(this.scanMaze);
        this.dismissLimit = 2;
    }

    //相关数组初始化
    public initArray(maze: number[][]) {
        for (let i = 0; i < maze.length; i++) {
            this.gridAnimalArray[i] = [];
            this.toolArray[i] = [];
            for (let j = 0; j < maze[i].length; j++) {
                let node: cc.Node = null;
                this.gridAnimalArray[i][j] = node;
                this.toolArray[i][j] = cc.v2(i, j + Math.abs(i - this.centerPoint.x) * this.shiftValue);
            }
        }
    }

    /**
     * 加入动画数组
     * @param node 要加入的结点
     * @param pos 加入结点在二维数组中的位置
     */
    public addToAnimalArray(node: cc.Node, pos: cc.Vec2) {
        this.gridAnimalArray[pos.x][pos.y] = node;

        //每一次加入结点，都应该扫描一次以确认是否产生消除
        let dimissCount = this.scanAnimalArray(pos);
        if (dimissCount > this.dismissLimit) {
            cc.log("是时候一波消除了!");
            //确认消除，开始消除有关操作
            this.addToDismissArray();
            this.figureOutScore(this.dismissLimit, this.gridDismissArray.length,
                node.getComponent("Grid").getStyle());
            //更新分数
            this.updateScore();
            this.gridAnimal.startToDismiss(node, pos, this.gridDismissArray, 
                this.gameScene.nodePool);
            this.clearPosition();
        }
    }

    public updateScore() {
        //放置方块之后更新分数
        this.gameScene.score  += this.addScore;
        this.gameScene.scoreDisplay.string = `${this.gameScene.score}`;
        cc.log(this.gameScene.scoreDisplay.string);
    }

    //在GridAnimal中运用,动画执行完毕之后增加方块
    public addLevelUpGridToScene(style: number, pos: cc.Vec2) {
        //清空消除方块的地图标记之后记得在地图加上合成方块
        // let style: number = node.getComponent("Grid").getStyle();
        this.gameScene.addAloneGridToScene(pos, style + 1);
    }

    /**
     * 利用坐标记录数组扫描全体落子点，将可消除方块加入消除数组
     */
    public addToDismissArray() {
        for (let i = 0; i < this.recordArray.length; i++) {
            let pos: cc.Vec2 = this.recordArray[i];
            if (this.gridAnimalArray[pos.x][pos.y] == null) {
                cc.log("警告，动画检测程序出错！");
            } else {
                this.gridDismissArray.push(this.gridAnimalArray[pos.x][pos.y]);
            }
        }
    }

    /**
     * 重置地图空位标记
     */
    public clearPosition() {
        for (let i = 0; i < this.recordArray.length; i++) {
            let pos: cc.Vec2 = this.recordArray[i];
            this.scanMaze[pos.x][pos.y] = EMPTY;
            this.gridAnimalArray[pos.x][pos.y] = null;
        }
    }

    //初始化标记数组
    public initCheckStatus() {
        while (this.recordArray.length > 0) {
            this.recordArray.pop();
        }
        while (this.gridDismissArray.length > 0) {
            this.gridDismissArray.pop();
        }
        
        for (let i = 0; i < this.gridAnimalArray.length; i++) {
            this.checkMaze[i] = [];
            for (let j = 0; j < this.gridAnimalArray[i].length; j++) {
                this.checkMaze[i][j] = false;
            }
        }
    }

    /**
     * BFS宽度优先,搜索周围相同的结点
     * @param pos 最新的落子点
     */
    public scanAnimalArray(pos: cc.Vec2): number {
        //初始化搜索状态
        this.initCheckStatus();

        let sameCount: number = 1;
        let gridQueue: cc.Vec2[] = [];
        let style = this.gridAnimalArray[pos.x][pos.y].getComponent("Grid").getStyle();

        gridQueue.push(cc.v2(pos));
        this.recordArray.push(cc.v2(pos));
        //将初始点标记为遍历过了
        this.checkMaze[pos.x][pos.y] = true;

        while (gridQueue.length > 0) {
            let temp: cc.Vec2 = gridQueue.shift();
            //开始向六个方向探索
            // for (let i: number = -1; i < 1 + 1; i++) {
            //     for (let j: number = -1; j < 1 + 1; j++) {
            //         let newPos = cc.v2(temp.x + i, temp.y + j);
            //         if (this.checkPos(newPos, pos, style)) {
            //             sameCount++;
            //             gridQueue.push(newPos);
            //             this.recordArray.push(cc.v2(newPos));
            //         } else {
            //             continue;
            //         }
            //     }
            // }
            let tempArray: cc.Vec2[] = this.getAroundGrid(this.toolArray[temp.x][temp.y]);
            for (let i = 0; i < tempArray.length; i++) {
                if (this.checkPos(tempArray[i], temp, style)) {
                    sameCount++;
                    gridQueue.push(tempArray[i]);
                    this.recordArray.push(cc.v2(tempArray[i]));
                }
            }
        }
        return sameCount;
    }

    /**
     * 用于配合BFS判断当前坐标是否符合规则
     * @param newPos 当前点
     * @param oldPos 对比的坐标
     * @param style 应该具有的风格
     */
    public checkPos(newPos: cc.Vec2, oldPos: cc.Vec2, style: number): boolean {
        // //确认坐标是否在周围
        // if ( ((newPos.x == oldPos.x - 1) && (newPos.y == oldPos.y + 1))
        // || ((newPos.x == oldPos.x + 1) && (newPos.y == oldPos.y + 1)) ) {
        //     return false;
        // }
        //确认坐标是否在范围内
        let length = (this.centerPoint.x - 1) * 2 + 1;
        if (newPos.x > length || newPos.y > length || newPos.x < 1 || newPos.y < 1) {
            return false;
        }
        //确认该点是否被遍历过了
        if (this.checkMaze[newPos.x][newPos.y]) {
            return false;
        } else {
            this.checkMaze[newPos.x][newPos.y] = true;
        }
        //确认坐标点是否存在节点对象
        if (this.gridAnimalArray[newPos.x][newPos.y] == null) {
            return false;
        }
        //确认类型是否相同
        let tempStyle = this.gridAnimalArray[newPos.x][newPos.y].getComponent("Grid").getStyle();
        if (tempStyle != style) {
            return false;
        }
        return true;
    }


    /**
     * 用于返回传入节点的周围结点
     * @param pos 输入的中心位置(注意是偏移位置)
     */
    public getAroundGrid(pos: cc.Vec2): Array<cc.Vec2> {
        let aroundArray: cc.Vec2[] = [];
        aroundArray.push(cc.v2(pos.x + 1, pos.y - this.shiftValue));
        aroundArray.push(cc.v2(pos.x + 1, pos.y + this.shiftValue));
        aroundArray.push(cc.v2(pos.x, pos.y - 1));
        aroundArray.push(cc.v2(pos.x, pos.y + 1));
        aroundArray.push(cc.v2(pos.x - 1, pos.y - this.shiftValue));
        aroundArray.push(cc.v2(pos.x - 1, pos.y + this.shiftValue));
        for (let i = 0; i < aroundArray.length; i++) {
            aroundArray[i] = this.changeToStandardPos(aroundArray[i]);
        }
        return aroundArray;
    }

    //将带有偏移值的坐标转换为正常坐标
    public changeToStandardPos(pos: cc.Vec2): cc.Vec2 {
        return cc.v2(pos.x, pos.y - Math.abs(pos.x - this.centerPoint.x) * 0.5);
    }


    public figureOutScore(dismissLimit: number, nodeCount: number, gridNumber: number) {
        //如果是用户点击落子的话，消除限制是2， 如果是电脑合成落子的话，消除限制是1
        if (dismissLimit == 2) {
            this.multipleRecord = 1;
        } else {
            this.multipleRecord += 1;
        }
        this.addScore = ScoreTable.times[this.multipleRecord] * ScoreTable.multiple[nodeCount] 
        * ScoreTable.basicScore[gridNumber]; 
    }
}