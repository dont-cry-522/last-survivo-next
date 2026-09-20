/** First five minutes: learn, strengthen, explore, then test the build. */
class OpeningDirector {
    constructor(){this.trained=false;this.ruinsHint=false;this.claimTime=null;this.trial=null;this.trialStarted=false;this.trialWon=false;this.bossStarted=false;}
    static phase(time){
        if(time>=300)return {name:'深入险境',interval:1,count:1,intensity:1};
        if(time<25)return {name:'初探',interval:2,count:1,intensity:.8};
        const rest=(time-25)%45<15;
        return rest?{name:'喘息',interval:6,count:1,intensity:.65}:{name:'围攻',interval:1.7,count:2,intensity:1.12};
    }
    train(game){
        if(this.trained||game.player.level<2)return;
        const p=game.player;this.trained=true;
        if(p.weaponType==='shotgun')p.bulletCount+=2;
        else if(p.weaponType==='fireball')p.blastRadius=95;
        else p.pierce+=1;
        this.trainingName=p.weaponType==='shotgun'?'散弹 +2 弹丸':p.weaponType==='fireball'?'火球爆炸范围扩大':'连发枪 +1 穿透';
        game._announce('武器强化：'+this.trainingName,'#e9cf86');
    }
    update(game){
        if(game.player.hp<=0)return;
        this.train(game);
        const time=game.survivalTime;
        if(this.trained&&!this.ruinsHint&&time>=30){this.ruinsHint=true;game._announce('沿主路向西：挑战遗迹守卫','#d9cd9a');}
        if(game.ruins.state==='claimed'&&this.claimTime===null)this.claimTime=time;
        if(this.claimTime!==null&&!this.trialStarted&&time-this.claimTime>=20&&!game.boss.active){
            const pos=ForestMap.spawn(game.player,50,game.canvas.width,game.canvas.height);
            const e=game.enemyManager.spawn('elite',pos.x,pos.y,Math.min(2,game.hpMultiplier),1.1);
            if(e){this.trial=e;e.openingTrial=this;this.trialStarted=true;e.combatState='recover';e.combatTimer=1.2;game._announce('精英追击：试试你的新搭配！','#ecc17b');}
        }
        if(this.trialStarted&&!this.trialWon&&(!this.trial.active||this.trial.hp<=0||this.trial.openingTrial!==this)){
            this.trialWon=true;game._announce('精英击败！继续探索','#d4df9a');
        }
        if(time>=240&&!this.bossStarted&&!game.boss.active&&game.ruins.state!=='guarded'&&(this.claimTime===null||this.trialWon)){
            game.spawnBoss();this.bossStarted=true;game.bossTimer=Config.DIFFICULTY.bossInterval;
        }
    }
    objective(game){
        if(!this.trained)return '目标：收集经验升到 2 级，强化武器';
        if(this.claimTime!==null&&!this.trialStarted)return game.boss.active?'精英追击等待首领战结束':`准备迎战精英 · ${Math.max(0,Math.ceil(20-(game.survivalTime-this.claimTime)))} 秒`;
        if(this.trialStarted&&!this.trialWon)return '目标：击败追击精英';
        if(this.trialWon)return '精英挑战完成 · 继续探索';
        if(game.survivalTime<30)return this.trainingName+' · 向西探索遗迹';
        return '目标：向西挑战遗迹宝箱';
    }
}
