function MainAssistant() {
}

MainAssistant.prototype.setup = function() {
	this.controller.stageController.setWindowOrientation("free");
	this.controller.listen(document, 'orientationchange', this.handleOrientation.bindAsEventListener(this));
	
	this.appMenuModel = {
		visible: true,
		items: [
            { label: $L("About"), command: 'About'},
			{ label: $L("Help"), command: 'Help'},
			{ label: $L("Donate"), command: 'Donate'},
			{ label: $L("Follow me on Twitter"), command: 'Twitter'},
			{ label: $L("More Apps by omoco"), command: 'MoreApps'}
        ]
    };
	
    this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, this.appMenuModel);
	
	BGCOLOR = "#ffffff";
	FGCOLOR = "#000000";
	TEXTSIZE = "14";
	
	AdMob.ad.initialize({
		pub_id: 'a14c3230fc24b8f',
		bg_color: '#ccc',
		text_color: '#333',
		test_mode: false
	});

	this.adCounter = 50;
	
	this.pause = false;

	this.lastIds = new Array();
	this.lastRequest = "";
	this.counter = 0;
	this.currentTopic = "Twitter";
	
	var cookie = new Mojo.Model.Cookie("prefs");
	var prefs = cookie.get();
	if(prefs != null)
	{
		this.currentTopic = prefs.currenttopic;
	}
	
	var shoutmessageattr = {
		hintText: 'Enter Twitter Topic...',
		textFieldName: 'name', 
		modelProperty: 'original', 
		multiline: false,
		focus: false
	};
	shoutmessagemodel = {
		'original' : this.currentTopic,
		disabled: false
	};
	this.controller.setupWidget('topictosearchfor', shoutmessageattr, shoutmessagemodel);

	this.spinnerLAttrs = {spinnerSize: 'large'};
	this.spinnerModel = {spinning: true};
	this.controller.setupWidget('waiting_spinner', this.spinnerLAttrs, this.spinnerModel);

	this.controller.listen($('ActionButton'),Mojo.Event.tap, this.sendButtonPressed.bind(this));
	this.controller.document.addEventListener("keyup", this.keyDownHandler.bind(this), true);

	this.scroller = this.controller.getSceneScroller();
	Mojo.Event.listen(this.scroller, 'scroll', this.scrollCheck.bind(this));

	this.getTopics();
	this.insertTweet();
}

MainAssistant.prototype.scrollCheck = function(event) {
	var state = this.controller.getSceneScroller().mojo.getState();
	if(state.top != 0) {
		$('pause').style.display = "block";
		this.pause = true;
	} else {
		$('pause').style.display = "none";
		this.pause = false;
	}
}

MainAssistant.prototype.keyDownHandler = function(event)
{
	if (event.keyCode == 13) {
		this.sendButtonPressed();
	}
}

MainAssistant.prototype.sendButtonPressed = function(event){
	this.spinnerModel.spinning = true;
	this.controller.modelChanged(this.spinnerModel);
	$('waiting_spinner_div').style.display = "block";
	
	this.currentTopic = this.controller.get("topictosearchfor").mojo.getValue();
	//$('topics').innerHTML = "";
	this.lastIds = new Array();
	this.counter = 0;
	this.getTopics();
	this.controller.getSceneScroller().mojo.scrollTo(0,0);
	var cookie = new Mojo.Model.Cookie("prefs");
	cookie.put({
		currenttopic: this.currentTopic
	});
}

MainAssistant.prototype.newadauto = function(event) {
	AdMob.ad.request({
		onSuccess: (function (ad) {
			$('topics').insert({ top: "<div style='background-color:" + BGCOLOR + ";border-bottom: solid 2px " + FGCOLOR + ";min-height:0px;width:100%;'></div>" });
			$('topics').insert({ top: ad });
		}).bind(this),
		onFailure: (function () {}).bind(this),
	});
}

MainAssistant.prototype.getTopics = function(){
	if(this.currentTopic != "") {
		var url = "http://search.twitter.com/search.json?rpp=10&q=" + escape(this.currentTopic);
		var request = new Ajax.Request(url, {
			method: 'get',
			evalJSON: 'force',
			onSuccess: this.getTopicsSuccess.bind(this),
			onFailure: this.getTopicsFailure.bind(this)
		});
	}
}

MainAssistant.prototype.getTopicsSuccess = function(response) {
	this.lastRequest = response.responseJSON.results;
	this.spinnerModel.spinning = false;
	this.controller.modelChanged(this.spinnerModel);
	$('waiting_spinner_div').style.display = "none";
}

MainAssistant.prototype.getTopicsFailure = function(response) {
	Mojo.Log.error("FAILURE");
}

MainAssistant.prototype.insertTweet = function(){
	if(!this.pause) {
		for(var i=(this.lastRequest.length-1); i>=0; i--) {
			var found = false;
			for(var ii=0; ii<this.lastIds.length; ii++)
				if(this.lastIds[ii] == this.lastRequest[i].id)
					found = true;
			
			if(!found) {
				this.adCounter++;
				if(this.adCounter > 75) {
					this.newadauto.bind(this).delay(0);
					this.adCounter = 0;
				}
				
				this.insertNew(this.lastRequest[i].from_user, this.lastRequest[i].profile_image_url, null, this.lastRequest[i].text, this.lastRequest[i].id);
				
				var tweetElements = $("topics").childElements();
				var tweetElementsLength = tweetElements.length
				if (tweetElementsLength > 50) {
					tweetElements[tweetElementsLength - 1].remove();
					tweetElements[tweetElementsLength - 2].remove();
				}
				
				this.lastIds.push(this.lastRequest[i].id);
				if(this.lastIds.length > 50)
					this.lastIds.splice(0,1);
				break;
			}
		}
		
		this.counter ++;
		
		if(this.counter > 7) {
			this.counter = 0;
			this.getTopics.bind(this).delay(1);
		}
	}
		
	this.insertTweet.bind(this).delay(2);
		
	//Mojo.Log.error("LASTIDS: " + this.lastIds.length + " - ELEMENTS: " + $("topics").childElements().length);
}

MainAssistant.prototype.autolink = function(s) {   
	var hlink = /\s(ht|f)tp:\/\/([^ \,\;\:\!\)\(\"\'\<\>\f\n\r\t\v])+/g;
	return (s.replace (hlink, function ($0,$1,$2) {
		s = $0.substring(1,$0.length); 
		while (s.length>0 && s.charAt(s.length-1)=='.') 
			s=s.substring(0,s.length-1);
		return " " + s.link(s); 
	}));
}

MainAssistant.prototype.insertNew = function(fromUser, profileImage, createdAt, text, id) {
	$('topics').insert({ top: "<div style='background-color:" + BGCOLOR + ";border-bottom: solid 2px " + FGCOLOR + ";min-height:54px;width:100%;'>" +
		"<table border=0 cellspacing=4 cellpadding=0>" +
			"<tr>" +
				"<td valign=top width=54 height=54 style='background-image:url(images/shadow.png);background-repeat:no-repeat'>" +
					"<a href='http://twitter.com/" + fromUser + "'><img height=48 width=48 src='" + profileImage + "'></a>" +
				"</td>" +
				"<td valign=top style='word-wrap: break-word;font-size:" + TEXTSIZE + "px;color:" + FGCOLOR + "'>" +
					"<b>" + fromUser + "</b> " + this.autolink(text) +
				"</td>" +
			"</tr>" +
		"</table>" +
	"</div>" });
}

MainAssistant.prototype.activate = function(event) {
	Mojo.Controller.stageController.setWindowProperties({ blockScreenTimeout: true });
}

MainAssistant.prototype.deactivate = function(event) {
}

MainAssistant.prototype.cleanup = function(event) {
}

MainAssistant.prototype.handleOrientation = function(event) {
	if (event.position == 4 || event.position == 5) {
		//$('footer').style.display = "none";
	} else if (event.position == 2 || event.position == 3) {
		//$('footer').style.display = "block";
	}
}

MainAssistant.prototype.handleCommand = function(event) {
    if(event.type == Mojo.Event.command) {
        switch(event.command) {
            case 'About':
                    this.controller.showAlertDialog({
                        onChoose: function(value) {},
                        title:"About",
                        message:'<div style="text-align:center;"><h1>TwitterTopic 1.0.2</h1>\
                        A program brought to you by\
                        <br>Sebastian Hammerl\
                        <br><br><a href="mailto:twittertopic@omoco.de">twittertopic@omoco.de</a><br>\
                        <a href="http://twittertopic.omoco.de">http://twittertopic.omoco.de</a></div>',
                    allowHTMLMessage: true,
                    choices:[ {label:'OK', value:'OK', type:'color'} ]
                });
                break;
            case 'Help':
                this.controller.showAlertDialog({
                    onChoose: function(value) {},
                    title:"Help",
                    message:'Just type in the topic you want to follow and see all messages which are sent via twitter regarding this topic.',
                    allowHTMLMessage: true,
                    choices:[ {label:'OK', value:'OK', type:'color'} ]
                });
                break;
            case 'Donate':
                this.controller.showAlertDialog({
                    onChoose: function(value) {},
                    title:"Donate",
                    message:'If you like this app click here to donate:<br><br><center><a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=TEUPLVZ5UBWNQ"><img width="138" height="39" src="images/btn_donate_LG.gif"></a></center>',
                    allowHTMLMessage: true,
                    choices:[ {label:'OK', value:'OK', type:'color'} ]
                });
                break;
            case 'Twitter':
                this.controller.serviceRequest("palm://com.palm.applicationManager", {
					   method: "open",
					   parameters:  {
					       id: 'com.palm.app.browser',
					       params: {
					           target: "http://twitter.com/omocopalm"
					       }
					   }
					 });
                break;
            case 'MoreApps':
                this.controller.serviceRequest("palm://com.palm.applicationManager", {
					   method: "open",
					   parameters:  {
					       id: 'com.palm.app.browser',
					       params: {
					           target: "http://omoco.de"
					       }
					   }
					 });
                break;
        }
    }
}; 