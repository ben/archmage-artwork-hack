export class MonsterArtApp extends Application {
  monsters = undefined
  monsterFilter = ''

  /** @override */
  static get defaultOptions () {
    const options = super.defaultOptions
    foundry.utils.mergeObject(options, {
      classes: options.classes
        .concat(['archmage-v2', 'app'])
        .filter(c => c !== 'archmage'),
      template: 'modules/archmage-artwork-hack/dialog.hbs',
      title: 'Monster Art Mapping Helper',
      width: 960,
      height: 960
    })
    return options
  }

  render (...args) {
    setTimeout(() => this.updateFilter(), 0)
    return super.render(...args)
  }

  /** @override */
  async getData (options) {
    if (!this.monsters) {
      const monsterIndex = game.packs.get('archmage.srd-Monsters').index
      this.monsters = monsterIndex
        .entries()
        .map(([id, monster]) => {
          const artKey = `Compendium.archmage.srd-Monsters.${id}`
          const mapEntry = game.archmage.system.moduleArt.map.get(artKey)
          if (mapEntry) {
            if (typeof mapEntry.actor === 'string') {
              mapEntry.actor = { img: mapEntry.actor, scale: 1 }
            }
            if (typeof mapEntry.token === 'string') {
              mapEntry.token = { img: mapEntry.token, scale: 1 }
            }
          }
          return {
            ...monster,
            mapEntry: mapEntry
          }
        })
        .toArray()
        .filter(x => !x.mapEntry)
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    }

    return {
      appId: this.appId,
      options: this.options,
      config: CONFIG.ARCHMAGE,
      monsters: this.monsters,
      filter: this.monsterFilter
    }
  }

  /** @override */
  activateListeners (html) {
    super.activateListeners(html)

    html.on('propertychange input', '.monster-filter', ev => {
      this.monsterFilter = ev.target.value
      this.updateFilter()
    })

    html.on('click', '.copy-new-yaml', ev => {
      ev.preventDefault()
      const newMonsters = this.monsters.filter(x => x.newMapEntry)
      let str = ''
      for (const nm of newMonsters) {
        str += `  ${nm._id}: # ${nm.name}\n`
        str += `    actor: ${nm.newMapEntry.actor}\n`
        str += `    token:\n`
        str += `      img: ${nm.newMapEntry.token.img}\n`
        str += `      scale: ${nm.newMapEntry.token.scale}\n`
      }
      console.log(str)
      navigator.clipboard.writeText(str).then(
        () => ui.notifications.info('YAML copied!'),
        e => ui.notifications.error(e)
      )
    })

    html.on('click', '.choose-artwork', ev => {
      ev.preventDefault()
      const monster = this.monsters.find(
        x => x._id === ev.currentTarget.dataset.actorId
      )
      new FilePicker({
        type: 'image',
        current: 'modules/pf2e-tokens-bestiaries/tokens/',
        displayMode: 'thumbs',
        callback: img => {
          monster.newMapEntry = {
            token: {
              img,
              scale: 1
            },
            actor: img.replace('/tokens/', '/portraits/')
          }
          this.render()
        }
      }).render(true)
    })
  }

  updateFilter () {
    const re = new RegExp(this.monsterFilter.toLowerCase(), 'i')
    for (const el of $(this.element).find('tr.monster-row')) {
      const jel = $(el)
      if (this.monsterFilter) {
        const match = jel.data('name').match(re)
        match ? jel.show() : jel.hide()
      } else {
        jel.show()
      }
    }
  }
}

Hooks.on('ready', () => {
  Handlebars.registerHelper('json', ctx => JSON.stringify(ctx))
  CONFIG.HACK = { MonsterArtApp }
})
