
<template>
<div v-bind:class="{overlay:overlayinfo?true:false, token:true}" v-bind:style="{position:overlayinfo?'absolute':null, height:overlayinfo?overlayheight:null, width:overlayinfo?overlaywidth:null, top:overlaytop, left:overlayleft}" v-bind:id="eleid" v-on:mousedown="onmousedown" v-on:mouseup="onmouseup" v-on:mouseout="onmouseout" v-on:mouseover="onmouseover" v-on:touchstart="ontouchstart" v-on:touchend="ontouchend" v-on:touchmove="ontouchmove">
	<!-- <svg height="100" v-bind:width="aspectratio" /> --> 
	<img v-bind:src="imagesrc" v-if="showImg" draggable="false" />
	<div v-if="showText" class="tokentext" v-bind:style="textstyle">{{text}}</div>
</div>
</template>

<script>
module.exports = {
	'props':['overlayinfo','tokenid'],
	data() {
		//console.log(this.tokenid,this.overlayinfo);
		let tokenid = this.tokenid;
		let tokeninfo = this.$store.getters.getTokenInfo(tokenid) || {};
		return {
			'tokeninfo':tokeninfo,
			'imagesrc':tokeninfo.imagesrc,
			//'aspectratio':(tokeninfo.aspectratio||100),
			'text':tokeninfo.text||'',
			'id':'token_'+tokenid,
			'textcolor':tokeninfo.textcolor,
		};
	},
	computed:{
		textstyle:function() {
			let s = {color:this.tokeninfo?this.tokeninfo.textcolor:null};
			return s;
		},
		eleid:function() {
			if (this.overlayinfo) return 'overlaytoken_'+this.tokenid;
			else return 'token_'+this.tokenid;
		},
		showText:function() {
			return this.text && !this.imagesrc;
		},
		showImg:function() {
			return this.imagesrc?true:false;
		},
		overlayleft:function () {
			if (!this.overlayinfo) return null;
			return (this.overlayinfo.dragdev.x || 0) + this.overlayinfo.basedim.x + 'px';
		},
		overlaytop:function() {
			if (!this.overlayinfo) return null;
			return (this.overlayinfo.dragdev.y || 0) + this.overlayinfo.basedim.y + 'px';
		},
		overlayheight:function() {
			if (!this.overlayinfo) return null;
			return this.overlayinfo.basedim.height + 'px';
		},
		overlaywidth:function() {
			if (!this.overlayinfo || !this.overlayinfo.basedim || !this.overlayinfo.basedim.width) return null;
			return this.overlayinfo.basedim.width+'px';
		}
	}
};
</script>


<style>
	.token {height:4vh;position:relative}
	.token > div.tokentext {height:100%;width:auto;}
	.token > img {max-width:100%;max-height:100%;object-fit:contain;}
	.token > div.tokentext {display:flex;justify-content:center;align-items;center;width:100%;}
	.token > svg {height:100%;width:auto;}

</style>