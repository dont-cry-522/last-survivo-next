/** Read-only inventory. Opening pauses combat; closing preserves an existing pause. */
class SkillInventory {
    constructor(game){
        this.game=game;this.signature='';
        this.button=document.createElement('button');this.button.type='button';this.button.className='inventory-open';this.button.textContent='技能 · 0';
        (game.mobileControls.enabled?document.querySelector('.mobile-toolbar'):document.body).append(this.button);
        this.dialog=document.createElement('dialog');this.dialog.className='inventory-dialog';this.dialog.setAttribute('aria-labelledby','inventory-title');
        this.dialog.innerHTML='<header><div><small>远征手记</small><h2 id="inventory-title">已掌握的技能</h2></div><button type="button" class="inventory-close">返回</button></header><p class="inventory-hint">查看期间游戏暂停 · 点击技能查看详情</p><div class="inventory-body"><nav aria-label="已有技能"></nav><article aria-live="polite"></article></div>';
        document.body.append(this.dialog);this.button.addEventListener('click',()=>this.open());
        this.dialog.querySelector('.inventory-close').addEventListener('click',()=>this.close());
        this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
        window.addEventListener('keydown',e=>{if(this.dialog.open){if(e.key==='Escape'){e.preventDefault();this.close();}e.stopImmediatePropagation();}},true);
        this.update();
    }
    update(){this.button.hidden=!['playing','paused'].includes(this.game.state);const skills=this.game.skillManager.skills;const signature=skills.map(s=>s.id+':'+s.currentTier).join('|');if(signature!==this.signature||!this.signature){this.signature=signature;this.button.textContent=`技能 · ${skills.length}`;}}
    open(){if(!['playing','paused'].includes(this.game.state))return;this.resume=this.game.state==='playing';if(this.resume)this.game.togglePause();this.game.mobileControls.release();this.game.player.keys={};const nav=this.dialog.querySelector('nav');nav.replaceChildren();
        for(const skill of this.game.skillManager.skills){const b=document.createElement('button');b.type='button';b.dataset.skill=skill.id;b.style.setProperty('--skill-color',SkillCategory.getColor(skill.category));b.textContent=`${skill.name} · ${skill.currentTier} 阶`;b.addEventListener('click',()=>this.select(skill));nav.append(b);}
        this.dialog.querySelector('article').textContent='还没有获得技能。击败怪物、收集经验，升级后就能选择新技能。';
        if(this.game.skillManager.skills.length)this.select(this.game.skillManager.skills[0]);this.dialog.showModal();this.dialog.querySelector('.inventory-close').focus();
    }
    select(skill){const article=this.dialog.querySelector('article');article.replaceChildren();for(const b of this.dialog.querySelectorAll('[data-skill]'))b.setAttribute('aria-pressed',String(b.dataset.skill===skill.id));
        const add=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;article.append(e);};
        add('h3',skill.name);add('p',`${SkillRarity.getName(skill.rarity)} · 第 ${skill.currentTier} 阶 / 共 ${skill.maxTier} 阶`);
        add('h4','当前效果');add('p',skill.getCurrentEffect().desc);
        const next=skill.getNextEvolution();add('h4',next?'下一阶效果':'已达到最高阶');if(next)add('p',next.desc);
        const related=SkillConfig.POOL.filter(s=>skill.synergies.includes(s.id)||s.synergies?.includes(skill.id));
        if(related.length){add('h4','推荐搭配');add('p',related.map(s=>s.name+(this.game.skillManager.getSkill(s.id)?'（已拥有）':'（未获得）')).join('、'));}
    }
    close(){if(!this.dialog.open)return;this.dialog.close();if(this.resume&&this.game.state==='paused')this.game.togglePause();this.resume=false;this.button.focus();}
}
