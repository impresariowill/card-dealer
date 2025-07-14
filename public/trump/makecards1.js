

function makeCard(i) {
	
	var aspectratio = 66;
/*
	let n = allcardnums[i];
	n = n.replace(/^1(?!0)/, 'A');
	n = n.replace(/♠/, 'S');
	n = n.replace(/♥/, 'H');
	n = n.replace(/♣/, 'C');
	n = n.replace(/♦/, 'D');
	*/
	let r = Math.floor(i/4)+1;
	let rn = (r==11?'J':(r==12?'Q':(r==13?'K':(r))))+'';
	let s = i%4+1;
	let ss = ['♠','♥','♣','♦'], ss1 = ['S','H','C','D'];
	let num = rn + (ss[s-1]);
	let n = (rn=='1'?'A':rn) + ss1[s-1];
	return {'imagesrc':'trump/'+n+'.png', 'backimagesrc':'trump/back.png', 'id':i+1, 'aspectratio':aspectratio, 'number':rn+ss[s-1], 'class1':r, 'class2':s};
	//return {'number':allcardnums[i], 'id':i, 'aspectratio':aspectratio};
}

 export function makeCards() {
	var allcards = []; for (let i = 0; i < 52; i++) allcards.push (makeCard(i));
	return allcards;
}