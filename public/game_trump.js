async function getCards() {
	var m = await import('./trump/makecards1.js');
	if (m) return m.makeCards();
}

export async function getGameInfo () {

	var playerplateinfo = {
		'dragtargetable':false,
		'dragdefaultstack':'handstack'
	};
	var cardstackinfo = {
		'handstack':{'id':'handstack', 'eleid':'handstack', 'cardselectable':true, 'carddraggable':true, 'dragtargetable':true, 'purpose':'handstack', 'privacy':'PRIVATE','longpressoperations':[
			{'value':{'cmd':'SORT', 'sortprior':['class1','class2']}, 'display':'Sort by rank then suit'},
			{'value':{'cmd':'SORT', 'sortprior':['class2','class1']}, 'display':'Sort by suit then rank'}
		]},
		'effectstack':{'id':'effectstack', 'eleid':'effectstack', 'cardselectable':false, 'carddraggable':true, 'dragtargetable':true, 'purpose':'effectstack', 'privacy':'PRIVATE'
			},
		'otherplayer_handstack':{'id':'player_#_handstack', 'eleid':'player_#_handstack', 'purpose':'handstack', 'privacy':'OTHERPLAYER_PRIVATE', 'dragtargetable':true, 'cardalwaysshowback':true
			},
		'otherplayer_effectstack':{'id':'player_#_effectstack', 'eleid':'player_#_effectstack', 'purpose':'effectstack', 'privacy':'OTHERPLAYER_PRIVATE', 'dragtargetable':true
			},
		'drawstack':{'id':'drawstack', 'eleid':'drawstack', 'purpose':'drawstack', 'carddirection':'vertical', 'cardalwaysshowback':true, 'dragtargetable':true,  
			'onclickaction':{
				'action':'MOVECARD',
				'dest':'handstack'
			},
			'longpressoperations':[
				{'value':[{'cmd':'COLLECTALLCARDS'},{'cmd':'SHUFFLE'}], 'display':'Collect Cards & Shuffle'},
				{'value':{'cmd':'DISTRIBUTE'}, 'display':'Distribute', 'targetstack':'handstack'},
				{'value':{'cmd':'DISTRIBUTE','cardsperplayer':5, 'targetstack':'handstack'}, 'display':'Distribute 5'},
				{'value':{'cmd':'DISTRIBUTE','cardsperplayer':13, 'targetstack':'handstack'}, 'display':'Distribute 13'},
			], 'privacy':'PUBLIC'},
		'discardstack':{'id':'discardstack', 'eleid':'discardstack', 'carddraggable':true, 'purpose':'discardstack', 'dragtargetable':true, 'emptycurrentcardstostackonadd':'discardstack2', 'privacy':'PUBLIC'},
		'discardstack2':{'id':'discardstack2', 'eleid':'discardstack2', 'purpose':'discardstack2', 'privacy':'PUBLIC',
			'onclickaction':{
				'action':'MOVECARD',
				'dest':'discardstack',
				'tobottom':true
			}
		}
	};

	var layoutinfo = {
		'styleobject':'display:flex;flex:1 1 0;overflow:hidden;flex-direction:column',
		'children':[
			{
				'type':'container',
				'key':'div_otherplayerarea',
				'eleid':'otherplayerarea',
				'classobject':'otherplayerarea',
				'showotherplayerareas':true
			},
			{
				'type':'container',
				'eleid':'publicarea',
				'children':[
					{'type':'cardstack', 'key':'discardstack2', 'props':{'stackid':'discardstack2', 'eleid':'discardstack2'}},
					{'type':'cardstack', 'key':'discardstack', 'props':{'stackid':'discardstack', 'eleid':'discardstack'}},
					{'type':'cardstack', 'key':'drawstack', 'props':{'stackid':'drawstack', 'eleid':'drawstack'}},
				]
			},
			{
				'type':'cardstack',
				'key':'effectstack',
				'props':{'stackid':'effectstack', 'eleid':'effectstack'},
			},
			{
				'type':'cardstack',
				'key':'handstack',
				'props':{'stackid':'handstack', 'eleid':'handstack'},
			}
		]

	};
	var addcss = `
#otherplayerarea {flex: 0 1 40%;display: flex;border: solid 1px black;background: #ffffee;overflow: hidden}	
#publicarea {flex: 0 1 20%; background: #f3fff3; display: flex; overflow: hidden;}
#discardstack {flex: 1 1 auto;overflow:hidden; border-style:solid; border-width: 1px 1px 1px 0px;border-color: black; padding:1vh; display:flex; flex-direction:row; align-items:flex-start;}
#discardstack2 {flex: 0 1 10%;overflow:hidden;height:80%; border-style:solid; border-width: 1px 0px 0px 1px;border-color: black; padding:1vh; display:flex;flex-direction:row;align-items:flex-start;}
#discardstack2 .cardwrap:last-child {overflow:hidden;}

#drawstack {flex:0 0 10vh; border:solid 1px black;padding:1vh; display:flex;flex-direction:column;align-items:flex-start;}
#effectstack {flex:0 1 20%;border:solid 1px black; background: #f3f3f3;padding:1vh; display:flex;}
#handstack {flex:0 1 20%;border:solid 1px black; background: #dddddd;padding:1vh; display:flex;}
	`;	

	var cards = await getCards();
	var cardidx = {};
	for (var i = 0; i < cards.length; i++) cardidx[cards[i].id] = cards[i];
	return {playerplateinfo:playerplateinfo, cardstackinfo:cardstackinfo, cards:cards, allcardsidx:cardidx, layoutinfo:layoutinfo, additionalcss:addcss};
}