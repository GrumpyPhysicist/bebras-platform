/* Copyright (c) 2012 Association France-ioi, MIT License http://opensource.org/licenses/MIT */
// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
   Object.keys = (function () {
      'use strict';
      var hasOwnProperty = Object.prototype.hasOwnProperty,
         hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
         dontEnums = [
            'toString',
            'toLocaleString',
            'valueOf',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'constructor'
         ],
         dontEnumsLength = dontEnums.length;

      return function (obj) {
         if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
            throw new TypeError('Object.keys called on non-object');
         }

         var result = [], prop, i;

         for (prop in obj) {
            if (hasOwnProperty.call(obj, prop)) {
               result.push(prop);
            }
         }

         if (hasDontEnumBug) {
            for (i = 0; i < dontEnumsLength; i++) {
               if (hasOwnProperty.call(obj, dontEnums[i])) {
                  result.push(dontEnums[i]);
               }
            }
         }
         return result;
      };
   }());
}


!function () {

   // init listerers and such..
   var components = Object.keys(UI);
   for (var i = 0; i < components.length; i++) {
      var component = UI[components[i]];
      if (typeof component.init === 'function') {
         component.init();
      }
   }
   // *** Version of this file
   // It will be checked against config.php's minimumCommonJsVersion; increment
   // this version on each important change, and modify config.php accordingly.
   var commonJsVersion = 2;

   // Timestamp of common.js initial loading, sent on checkPassword too
   var commonJsTimestamp = Date();

   // Redirections from Scratch contests to Blockly versions when user is on a
   // mobile device
   var scratchToBlocklyContestID = {
      //  "223556559616198459": "40284639530086786", // 2019.1 white
      "604034698343183586": "503470753157869958", // 2019.1 yellow
      "719201791586950565": "727677046248069693", // 2019.1 orange
      "714570819714244963": "185545119426515177" // 2019.1 green
   };


   var contestID;
   var contestFolder;
   var contestVisibility;
   var contestShowSolutions;
   var contestOpen;
   var fullFeedback;
   var nextQuestionAuto;
   var nbUnlockedTasksInitial;
   var newInterface;
   var customIntro;
   var solutionsLoaded;
   var teamID = 0;
   var teamPassword = "";
   var contestImagePreload = {};
   var questionsData = {};
   var questionsKeyToID = {};
   var questionsToGrade = [];
   var scores = {};
   var questionUnlockedLevels = {};
   var bonusScore = 0;
   var ffTeamScore = 0;
   var ffMaxTeamScore = 0; // fullFeedback versions
   var teamScore = 0;
   var maxTeamScore = 0;
   var sending = false;
   var answersToSend = {};
   var answers = {};
   var defaultAnswers = {};
   var lastSelectQuestionTime = 0;
   var currentQuestionKey = "";
   // SID is initialized to the empty string so that its encoding in an AJAX query
   // is predictable (rather than being either '' or 'null').
   window.SID = '';
   var hasAnsweredQuestion = false;
   var hasDisplayedContestStats = false;
   var delaySendingAttempts = 60000;
   var nbSubmissions = 0;
   var t = i18n.t;
   var groupCheckedData = null;
   // Function listening for resize events
   var bodyOnResize = null;

   function getParameterByName (name) {
      name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
      var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
         results = regex.exec($window.location.toString());
      return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
   }

   var logToConsole = function (logStr) {
      if (window.console) {
         console.error(logStr);
      }
   };

   window.toDate = function (dateStr, sep, fromServer) {
      var dateOnly = dateStr.split(" ")[0];
      var timeParts = dateStr.split(" ")[1].split(":");
      var parts = dateOnly.split(sep);
      if (fromServer) {
         return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], timeParts[0], timeParts[1]));
      }
      return new Date(parts[2], parts[1] - 1, parts[0], timeParts[0], timeParts[1]);
   }


   window.dateToDisplay = function (d) {
      var date = $.datepicker.formatDate("dd/mm/yy", d);
      var h = d.getHours();
      h = (h < 10) ? ("0" + h) : h;

      var m = d.getMinutes();
      m = (m < 10) ? ("0" + m) : m;

      var s = d.getSeconds();
      s = (s < 10) ? ("0" + s) : s;

      return date;// + " " + h + ":" + m + ":" + s;
   }

   window.utcDateFormatter = function (cellValue) {
      if ((cellValue == undefined) || (cellValue == "0000-00-00 00:00:00") || (cellValue == "")) {
         return "";
      }
      var localDate = window.toDate(cellValue, "-", true, true);
      return window.dateToDisplay(localDate);
   }

   // no references
   // window.unlockAllLevels = function () {
   //    UI.GridView.unlockAllLevels(getSortedQuestionIDs, questionsData, questionUnlockedLevels);
   // };


   /* global error handler */
   var nbErrorsSent = 0;
   var logError = function () {
      var chunks = [];
      try {
         var n = arguments.length, i;
         if (currentQuestionKey !== undefined) {
            chunks.push(["questionKey", currentQuestionKey]);
         }
         for (i = 0; i < n; i++) {
            var arg = arguments[i];
            if (typeof arg === "string") {
               chunks.push([i, arg]);
            } else if (typeof arg === "object") {
               if (typeof arg.name === "string") {
                  chunks.push([i, "name", arg.name]);
               }
               if (typeof arg.message === "string") {
                  chunks.push([i, "message", arg.message]);
               }
               if (typeof arg.stack === "string") {
                  chunks.push([i, "stack", arg.stack]);
               }
               if (typeof arg.details === "object" && arg.details !== null) {
                  var details = arg.details;
                  if (details.length >= 4) {
                     chunks.push([i, "details", "message", details[0]]);
                     chunks.push([i, "details", "file", details[1]]);
                     chunks.push([i, "details", "line", details[2]]);
                     chunks.push([i, "details", "column", details[3]]);
                     var ex = details[4];
                     if (ex && typeof ex === "object") {
                        chunks.push([i, "details", "ex", "name", ex.name]);
                        chunks.push([i, "details", "ex", "message", ex.message]);
                        chunks.push([i, "details", "ex", "stack", ex.stack]);
                     }
                  } else {
                     chunks.push([i, "details", "keys", Object.keys(details)]);
                  }
               }
               chunks.push([i, "keys", Object.keys(arg)]);
            } else {
               chunks.push([i, "type", typeof arg]);
            }
         }
      } catch (ex) {
         chunks.push(["oops", ex.toString()]);
         if (typeof ex.stack === "string") {
            chunks.push(["oops", "stack", ex.stack]);
         }
      }
      var logStr;
      try {
         logStr = JSON.stringify(chunks);
      } catch (ex) {
         logStr = ex.toString();
         if (typeof ex.stack === "string") {
            logStr += "\n" + ex.stack;
         }
      }
      logToConsole(logStr);
      nbErrorsSent = nbErrorsSent + 1;
      if (nbErrorsSent > 10) {
         return;
      }
      $.post('logError.php', {errormsg: logStr, questionKey: currentQuestionKey}, function (data) {
         if (!data || !data.success) {
            logToConsole('error from logError.php');
         }
      }, 'json').fail(function () {
         logToConsole('error calling logError.php');
      });
   };

   window.onerror = function () {
      logError({
         message: 'global error handler',
         details: Array.prototype.slice.call(arguments)
      });
   };

   window.logError = logError;


   /**
    * Old IE versions does not implement the Array.indexOf function
    * Setting it in Array.prototype.indexOf makes IE crash
    * So the graders are using this inArray function
    *
    * TODO: is it still used?
    *
    * @param {array} arr
    * @param {type} value
    * @returns {int}
    */
   function inArray (arr, value) {
      for (var i = 0; i < arr.length; i++) {
         if (arr[i] == value) {
            return i;
         }
      }
      return -1;
   }


   /**
    * Add or remove the meta viewport tag
    *
    * @param {bool} toggle
    */
   window.toggleMetaViewport = function (toggle) {
      if (toggle) {
         if ($('meta[name=viewport]').length) {return;}
         // Add
         var metaViewport = document.createElement('meta');
         metaViewport.name = "viewport";
         metaViewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
         document.getElementsByTagName('head')[0].appendChild(metaViewport);
      } else {
         // Remove
         $('meta[name=viewport]').remove();
      }
   }

   /**
    * Fetch configuration
    */
   function getConfig (callback) {
      if (window.config) {
         if (callback) {callback();}
         return;
      }

      $.post("data.php", {action: 'getConfig', p: getParameterByName('p')},
         function (data) {
            window.config = data.config;
            if (callback) {callback();}
         }, "json");
   }

   /**
    * Log activity on a question (question load, attempt)
    */
   function logActivity (teamID, questionID, type, answer, score) {
      if (typeof window.config == 'undefined') {
         getConfig(function () {
            logActivity(teamID, questionID, type, answer, score);
         });
         return;
      }
      if (!window.config.logActivity) {return;}
      $.post("activity.php", {teamID: teamID, questionID: questionID, type: type, answer: answer, score: score});
   }

   /**
    * The platform object as defined in the Bebras API specifications
    *
    * @type type
    */
   var platform = {
      updateHeight: function (height, success, error) {
         this.updateDisplay({height: height}, success, error);
      },
      updateDisplay: function (data, success, error) {
         if (data.height) {
            questionIframe.setHeight(data.height);
         }
         if (success) {success();}
      },
      openUrl: function (url) {
         // not used here
      },
      showView: function (views) {
         // not used here
      },
      askHint: function (numHint) {
         // not used here
      },
      getTaskParams: function (key, defaultValue, success, error) {
         var questionData = questionsData[questionsKeyToID[questionIframe.questionKey]];
         var unlockedLevels = 1;
         if (questionUnlockedLevels[questionIframe.questionKey] != null) {
            unlockedLevels = questionUnlockedLevels[questionIframe.questionKey];
         }
         var res = {
            'minScore': questionData.minScore,
            'maxScore': questionData.maxScore,
            'noScore': questionData.noAnswerScore,
            'randomSeed': teamID,
            'options': questionData.options,
            'pointsAsStars': newInterface,
            'unlockedLevels': unlockedLevels
         };
         if (key) {
            if (key !== 'options' && key in res) {
               res = res[key];
            } else if (res.options && key in res.options) {
               res = res.options[key];
            } else {
               res = (typeof defaultValue !== 'undefined') ? defaultValue : null;
            }
         }
         success(res);
      },
      validate: function (mode, success, error) {
         this.validateWithQuestionKey(mode, success, error, questionIframe.questionKey);
      },
      validateWithQuestionKey: function (mode, success, error, questionKey) {
         if (TimeManager.isContestOver()) {
            alert(t("contest_closed_answers_readonly"));
            if (error) {error();} else if (success) {success();}
            return;
         }

         if (mode == "nextImmediate") {
            platform.nextQuestion(0);
         }

         // Store the answer
         questionIframe.task.getAnswer(function (answer) {
            if (mode == "cancel") {
               answer = "";
            }
            var questionID = questionsKeyToID[questionKey];

            if (mode == "log") {
               logActivity(teamID, questionID, "attempt", answer);
               return;
            }

            var questionData = questionsData[questionID];
            if (fullFeedback) {
               questionIframe.task.gradeAnswer(answer, null, function (score, message) {
                  logActivity(teamID, questionID, "submission", answer, score);
                  if (score < questionData.maxScore) {
                     mode = "stay";
                  }
                  if ((answer != defaultAnswers[questionKey]) || (typeof answers[questionKey] != 'undefined')) {
                     var prevScore = 0;
                     if (typeof scores[questionKey] != 'undefined') {
                        prevScore = scores[questionKey].score;
                     }
                     if ((typeof answers[questionKey] == 'undefined') ||
                        ((answer != answers[questionKey]) && (score >= prevScore))) {
                        scores[questionKey] = {score: score, maxScore: questionData.maxScore};
                        submitAnswer(questionKey, answer, score);
                        answers[questionKey] = answer;

                        updateUnlockedLevels(getSortedQuestionIDs(questionsData), questionKey);
                        if (!newInterface) {
                           UI.OldListView.updateScore(questionData.key, score, questionData.maxScore);
                        }
                     }
                  }
                  computeFullFeedbackScore();
                  platform.continueValidate(mode);
                  if (success) {success();}
               }, logError);
            } else {
               submitAnswer(questionKey, answer, null);
               answers[questionKey] = answer;
               platform.continueValidate(mode);
               if (success) {success();}
            }
            //         if (success) {success();}
         }, logError);
      },
      firstNonVisitedQuestion: function (delay) {
         function timeoutFunFactory (questionID) {
            return function () {
               window.selectQuestion(questionID, false);
            };
         }
         var sortedQuestionIDs = getSortedQuestionIDs(questionsData);
         for (var iQuestionID = 0; iQuestionID < sortedQuestionIDs.length; iQuestionID++) {
            var questionID = sortedQuestionIDs[iQuestionID];
            var questionData = questionsData[questionID];
            if ((questionUnlockedLevels[questionData.key] > 0) && (!questionData.visited)) {
               setTimeout(timeoutFunFactory(questionID), delay);
               return;
            }
         }
         window.backToList();
      },
      nextQuestion: function (delay) {
         if (newInterface) {
            this.firstNonVisitedQuestion(delay);
            return;
         }
         var questionData = questionsData[questionsKeyToID[questionIframe.questionKey]];
         var nextQuestionID = questionData.nextQuestionID;
         // Next question
         if (nextQuestionID !== "0") {
            setTimeout(function () {
               window.selectQuestion(nextQuestionID, false);
            }, delay);
         }
         else {
            setTimeout(function () {
               alert(t("last_question_message"));
            }, delay);
         }
      },
      continueValidate: function (mode) {
         if (!nextQuestionAuto) {
            return;
         }
         var questionData = questionsData[questionsKeyToID[questionIframe.questionKey]];
         var nextQuestionID = questionData.nextQuestionID;
         if ((!hasAnsweredQuestion) && (nextQuestionID !== "0")) {
            if ((mode != "stay") && (mode != "cancel")) {
               if (fullFeedback) {
                  alert(t("first_question_message_full_feedback"));
               } else {
                  alert(t("first_question_message"));
               }
            }
            hasAnsweredQuestion = true;
         }

         var delay = 2300;
         switch (mode) {
            case 'stay':
            case 'cancel':
               break;
            case 'next':
            case 'done':
               delay = 400;
               platform.nextQuestion(delay);
               break;
            default:
               // problem!
               break;
         }
      }
   };

   /**
    * Task iframe
    */
   var questionIframe = {
      iframe: null,
      doc: null,
      body: null,
      tbody: null,
      initialized: false,
      loaded: false,
      questionKey: null,
      task: null,
      gradersLoaded: false,
      autoHeight: false,

      /**
       * Load a javascript file inside the iframe
       *
       * @param string filename
       * @param {function} callback
       */
      addJsFile: function (filename, callback) {
         var script = this.doc.createElement('script');
         script.src = filename;
         if (script.addEventListener) {
            script.addEventListener('load', callback, false);
         }
         else if (script.readyState) {
            script.onreadystatechange = function () {
               if (script.readyState === 'complete' || script.readyState === 'loaded') {
                  callback();
               }
            };
         }

         this.tbody.appendChild(script);
      },

      /**
       * Load a css file inside the iframe
       *
       * @param string filename
       */
      addCssFile: function (filename) {
         var css = this.doc.createElement('link');
         css.rel = 'stylesheet';
         css.type = 'text/css';
         css.href = filename;
         this.doc.getElementsByTagName('head')[0].appendChild(css);
      },

      /**
       * Add some css inside the iframe
       *
       * @param {string} content Css content
       */
      addCssContent: function (content) {
         var style = this.doc.createElement('style');
         style.type = 'text/css';
         var iframeWin = this.iframe.contentWindow;
         if (iframeWin.addEventListener) {
            style.appendChild(this.doc.createTextNode(content));
         } else { // IE
            // http://stackoverflow.com/questions/5618742/ie-8-and-7-bug-when-dynamically-adding-a-stylesheet
            style.styleSheet.cssText = content;
         }
         // We can put it in #jsContent as it makes no difference
         this.doc.getElementById('jsContent').appendChild(style);
      },

      /**
       * Add some javascript inside the iframe
       *
       * @param {string} content Javascript content
       */
      addJsContent: function (content) {
         var script = this.doc.createElement('script');
         var iframeWin = this.iframe.contentWindow;
         if (iframeWin.addEventListener) {
            script.appendChild(this.doc.createTextNode(content));
         } else {
            script.text = content;
         }
         this.doc.getElementById('jsContent').appendChild(script);
      },

      /**
       * Remove the JS added by the addJsContent method
       */
      removeJsContent: function () {
         this.body.find('#jsContent').empty();
      },

      /**
       * Inject Javascript code in iframe
       */
      inject: function (jsContent) {
         var iframeWin = this.iframe.contentWindow;
         if (!iframeWin.eval && iframeWin.execScript) {
            iframeWin.execScript("null");
         }
         if (iframeWin.eval) {
            iframeWin.eval(jsContent);
         } else {
            alert("No eval!");
         }
      },

      /**
       * Evaluate something in the iframe context
       *
       * @param {string} expr
       * @returns result
       */
      evaluate: function (expr) {
         return this.iframe.contentWindow.eval(expr);
      },

      /**
       * Initialize the question iframe, must be run before anything else.
       * Acts somewhat like a constructor
       *
       * @param {function} callback when everything is loaded
       */
      initialize: function (callback) {

         UI.TaskFrame.updateIFrame();

         this.iframe = UI.TaskFrame.getIframe();
         this.doc = this.iframe.contentWindow.document;
         this.body = $('body', this.doc);
         this.tbody = this.doc.getElementsByTagName('body')[0];
         this.autoHeight = false;
         $('body').removeClass('autoHeight');
         window.toggleMetaViewport(false);

         this.setHeight(0);
         this.body.css('width', '782px');
         this.body.css('margin', '0');
         this.body.css('padding', '0');

         // users shouldn't reload iframes.
         this.inject('window.onbeforeunload = function() {return "' + t("error_reloading_iframe") + '";};');

         this.inject('window.onerror = window.parent.onerror;');

         // Inject localized strings
         this.inject('var t = function(item) {return item;}; function setTranslate(translateFun) { t = translateFun; }');
         this.iframe.contentWindow.setTranslate(t);

         // Inject ImagesLoader
         this.inject('var ImagesLoader = { \n\
    newUrlImages: {}, \n\
    loadingImages: new Array(), \n\
    imagesToPreload: null, \n\
    contestFolder: null, \n\
    nbImagesToLoad: 0, \n\
    nbImagesLoaded: 0, \n\
    nbPreloadErrors: 0, \n\
    switchToNonStatic: false, \n\
    preloadCallback: null, \n\
    preloadAllImages: null, \n\
    /* Defines what function to call once the preload phase is over */ setCallback: function (callback) { \n\
        this.preloadCallback = callback; \n\
    }, \n\
    /* Called by the generated contest .js file with the list of images to preload */ setImagesToPreload: function (imagesToPreload) { \n\
        this.imagesToPreload = imagesToPreload; \n\
    }, \n\
    addImagesToPreload: function (imagesToPreload) { \n\
        this.imagesToPreload = this.imagesToPreload.concat(imagesToPreload); \n\
    }, \n\
    errorHandler: function () { \n\
        var that = ImagesLoader;\n\
        that.loadingImages[that.nbImagesLoaded].onload = null; \n\
        that.loadingImages[that.nbImagesLoaded].onerror = null; \n\
        that.nbPreloadErrors++;  \n\
        if (that.nbPreloadErrors == 4){ \n\
            alert(t("error_connexion_server")); \n\
        } \n\
        if (that.nbPreloadErrors == 20) { \n\
            alert(t("error_connexion_server_bis")); \n\
            that.nbImagesLoaded = that.nbImagesToLoad; \n\
        } \n\
        setTimeout(that.loadNextImage, 2000); \n\
    }, \n\
    /* * Called after each successful load of an image. Update the interface and starts * loading the next image. */ loadHandler: function () { \n\
        var that = ImagesLoader; \n\
        that.loadingImages[that.nbImagesLoaded].onload = null; \n\
        that.loadingImages[that.nbImagesLoaded].onerror = null; \n\
        that.nbImagesLoaded++; \n\
        that.nbPreloadErrors = 0;  \n\
        parent.setNbImagesLoaded("" + that.nbImagesLoaded + "/" + that.nbImagesToLoad); \n\
        setTimeout(function() { that.loadNextImage(); }, 1); \n\
    }, \n\
    loadNextImage: function () { \n\
        var that = ImagesLoader; \n\
        if (that.nbImagesLoaded === that.nbImagesToLoad) { \n\
            that.preloadCallback(); \n\
            return; \n\
        } \n\
        if (that.loadingImages[that.nbImagesLoaded] == undefined) { \n\
            that.loadingImages[that.nbImagesLoaded] = new Image(); \n\
            that.loadingImages[that.nbImagesLoaded].onerror = that.errorHandler; \n\
            that.loadingImages[that.nbImagesLoaded].onload = that.loadHandler; \n\
            var srcImage = that.imagesToPreload[that.nbImagesLoaded]; \n\
            if (srcImage == "") { \n\
                that.loadHandler(); \n\
                return; \n\
            } \n\
            if (that.nbPreloadErrors > 0) { \n\
                var oldSrcImage = srcImage; \n\
                srcImage += "?v=" + that.nbPreloadErrors + "_" + Parameters.teamID; \n\
                that.newUrlImages[oldSrcImage] = srcImage; \n\
                if (that.nbPreloadErrors > 2) { \n\
                    that.switchToNonStatic = true; \n\
                } \n\
            } \n\
            for(var i=0; i<window.config.imagesURLReplacements.length; i++) { \n\
                srcImage = srcImage.replace(window.config.imagesURLReplacements[i][0], window.config.imagesURLReplacements[i][1]); \n\
            } \n\
            if (that.switchToNonStatic) { \n\
                srcImage = srcImage.replace("static1.france-ioi.org", "concours1.castor-informatique.fr"); \n\
                srcImage = srcImage.replace("static2.france-ioi.org", "concours2.castor-informatique.fr"); \n\
                for(var i=0; i<window.config.imagesURLReplacementsNonStatic.length; i++) { \n\
                    srcImage = srcImage.replace(window.config.imagesURLReplacementsNonStatic[i][0], window.config.imagesURLReplacements[i][1]); \n\
                } \n\
                that.newUrlImages[that.imagesToPreload[that.nbImagesLoaded]] = srcImage; \n\
            } \n\
            if(window.config.upgradeToHTTPS) { \n\
                srcImage = srcImage.replace(/^http:/, "https:"); \n\
            } \n\
            that.loadingImages[that.nbImagesLoaded].src = srcImage; \n\
        } else { \n\
            ImagesLoader.loadHandler(); \n\
        } \n\
    }, \n\
    preload: function (contestFolder) { \n\
        ImagesLoader.contestFolder = contestFolder; \n\
        ImagesLoader.nbImagesToLoad = ImagesLoader.imagesToPreload.length; \n\
        ImagesLoader.loadNextImage(); \n\
    }, \n\
    /* Updates the src attribute of images that couldnt be pre-loaded with the original url. */ refreshImages: function () { \n\
        $.each($("img"), function (i, elem) { \n\
            var posContest = this.src.indexOf("contest"); \n\
            if (posContest < 0) { \n\
                return; \n\
            } \n\
            if (ImagesLoader.newUrlImages[this.src] != undefined) { \n\
                this.src = ImagesLoader.newUrlImages[this.src]; \n\
            } \n\
        }); \n\
    } \n\
};');

         // No more global css file
         //this.addCssFile(contestsRoot + '/' + contestFolder + '/contest_' + contestID + '.css');

         UI.TaskFrame.updateBorder(this.body, newInterface);

         this.initialized = true;

         // Get configuration and image preloader
         var that = this;
         getConfig(function () {
            that.inject('window.config = window.parent.config;');
            // Call image preloading
            if (contestImagePreload[contestID]) {
               that.inject(contestImagePreload[contestID]);
               callback();
            } else {
               // Load image preload lists
               $.get(window.contestsRoot + '/' + contestFolder + "/contest_" + contestID + ".js?origin=" + window.location.protocol + window.location.hostname, function (content) {
                  contestImagePreload[contestID] = content;
                  that.inject(content);
                  callback();
               }, 'text').fail(function () {
                  // Continue anyway
                  callback();
               });
            }
         });

      },

      /**
       * Run the task, should be called only by the loadQuestion function
       */
      run: function (taskViews, callback) {
         // Reset autoHeight-related styles
         $('body').removeClass('autoHeight');
         UI.TaskFrame.updatePadding(questionIframe.doc, '5px');

         TaskProxyManager.getTaskProxy('question-iframe', withTask, true);
         function withTask (task) {
            questionIframe.task = task;
            TaskProxyManager.setPlatform(task, platform);
            task.getMetaData(function (metaData) {
               questionIframe.autoHeight = !!metaData.autoHeight;
               if (questionIframe.autoHeight) {
                  $('body').addClass('autoHeight');
                  UI.TaskFrame.updatePadding(questionIframe.doc, '');
                  window.toggleMetaViewport(true);
                  questionIframe.updateHeight();
               }
            });
            task.load(taskViews, function () {
               //$('.questionIframeLoading').hide();
               task.showViews(taskViews, function () {
                  if (typeof defaultAnswers[questionIframe.questionKey] == 'undefined') {
                     task.getAnswer(function (strAnswer) {
                        defaultAnswers[questionIframe.questionKey] = strAnswer;
                     }, logError);
                  }
                  questionIframe.updateHeight();
               }, logError);
            }, logError);
            // Iframe height "hack" TODO: why two timers?
            setTimeout(questionIframe.updateHeight, 500);
            setTimeout(questionIframe.updateHeight, 1000);

            // TODO : test without timeout : should not be needed.
            setTimeout(function () {
               var nextStep = function () {
                  setTimeout(function () {
                     if (!hasDisplayedContestStats) {
                        if (fullFeedback) {
                           if (!newInterface) {
                              alert(t("contest_starts_now_full_feedback"));
                           }
                        } else {
                           alert(t("contest_starts_now"));
                        }
                        hasDisplayedContestStats = true;
                     }
                  }, 200);

                  if (callback) {
                     callback();
                  }
               };

               // Load the session's answer, if any
               if (answers[questionIframe.questionKey]) {
                  var answer = answers[questionIframe.questionKey];
                  task.reloadAnswer(answer, function () {
                     nextStep();
                  }, logError);
               } else {
                  nextStep();
               }
            }, 50);
         }
      },

      /**
       * Update the iframe height depending on the task parameters
       */
      updateHeight: function (callback) {
         if (!questionIframe.loaded || !questionIframe.task) {
            if (callback) {callback();}
            return;
         }
         var fullHeight = UI.TaskFrame.getHeight() - $('html').height() + document.documentElement.clientHeight;
         if (questionIframe.autoHeight) {
            // Because the layout can vary, we simply take the height of the html
            // and compare to the desired height, hence finding how much the
            // iframe's height needs to change
            platform.updateDisplay({height: fullHeight});
            if (callback) {callback();}
         } else {
            questionIframe.task.getHeight(function (height) {
               height = Math.max(fullHeight, height + 25);
               platform.updateDisplay({height: height});
               if (callback) {callback();}
            }, logError);
         }
      },

      /**
       * body resize event handler
       */
      onBodyResize: function () {
         // We only need to update if the iframe is on auto-height
         if (questionIframe.autoHeight) {
            questionIframe.updateHeight();
         }
      },

      /**
       * Load the question, should be call only by the load function
       *
       * @param string questionKey
       */
      loadQuestion: function (taskViews, questionKey, callback) {
         var questionID = questionsKeyToID[questionKey];
         logActivity(teamID, questionID, "load");

         UI.TaskFrame.loadQuestion(this.body, questionKey);

         // Remove task-specific previous added JS, then add the new one
         this.removeJsContent();

         this.addJsContent('window.grader = null;');
         this.addJsContent('window.task = null;');

         // Load js modules
         UI.TaskFrame.loadQuestionJS(questionIframe, questionKey);

         this.addJsContent('window.contestsRoot = "' + window.contestsRoot + '";');
         this.addJsContent('window.sAbsoluteStaticPath = "' + window.sAbsoluteStaticPath + '";');
         this.addJsContent('window.sAssetsStaticPath = "' + window.sAssetsStaticPath + '";');
         this.addJsContent('window.contestFolder = "' + contestFolder + '";');

         // Load specific js
         this.addJsContent($('#javascript-' + questionKey).attr('data-content'));
         if ('solution' in taskViews) {
            this.addJsContent($('#javascript-solution-' + questionKey).attr('data-content'));
         }
         if ('grader' in taskViews) {
            this.addJsContent($('#javascript-grader-' + questionKey).attr('data-content'));
         }

         // Load css modules
         UI.TaskFrame.loadQuestionCSS(questionIframe, questionKey);

         questionIframe.loaded = true;
         questionIframe.questionKey = questionKey;

         setTimeout(function () {
            questionIframe.run(taskViews, function () {
               UI.TaskFrame.updateSolutionChoices(questionIframe, questionKey);
               callback();
            });
         }, 100);

      },

      /**
       * Load the question when ready
       *
       * @param {string} questionKey
       */
      load: function (taskViews, questionKey, callback) {
         var that = this;
         var cb = function () {
            UI.TaskFrame.showQuestionIframe();
            that.loadQuestion(taskViews, questionKey, callback);
         };
         if (this.loaded) {
            if (questionIframe.task && questionIframe.task.iframe_loaded) {
               questionIframe.task.unload(function () {
                  that.loaded = false;
                  questionIframe.initialize(cb);
               }, function () {
                  logError(arguments);
                  that.loaded = false;
                  questionIframe.initialize(cb);
               });
            }
            else {
               this.loaded = false;
               questionIframe.initialize(cb);
            }
         }
         else {
            this.loadQuestion(taskViews, questionKey, callback);
         }
      },

      setHeight: function (height) {
         UI.TaskFrame.updateHeight(height, questionIframe);
      }
   };

   window.Utils = {
      disableButton: function (buttonId) {
         var button = $("#" + buttonId);
         if (button.attr("disabled")) {
            return false;
         }
         button.attr("disabled", true);
         return true;
      },

      enableButton: function (buttonId) {
         var button = $("#" + buttonId);
         button.attr("disabled", false);
      },

      pad2: function (number) {
         if (number < 10) {
            return "0" + number;
         }
         return number;
      },

      /*
       * Returns an array with numbers 0 to nbValues -1.
       * Unless preventShuffle is true, the order is "random", but
       * is fully determined by the value of the integer orderKey
      */
      getShuffledOrder: function (nbValues, orderKey, preventShuffle) {
         var order = [];
         for (var iValue = 0; iValue < nbValues; iValue++) {
            order.push(iValue);
         }
         if (preventShuffle) {
            return order;
         }
         for (iValue = 0; iValue < nbValues; iValue++) {
            var pos = iValue + (orderKey % (nbValues - iValue));
            var tmp = order[iValue];
            order[iValue] = order[pos];
            order[pos] = tmp;
         }
         return order;
      }
   };

   /*
    * TimeManager is in charge of checking and displaying how much time contestants
    * still have to answer questions.
    * all times are in seconds since 01/01/70
   */
   var TimeManager = {
      ended: false,  // is set to true once the contest is closed
      initialRemainingSeconds: null, // time remaining when the contest is loaded (in case of an interruption)
      timeStart: null, // when the contest was loaded (potentially after an interruption)
      totalTime: null, // time allocated to this contest
      endTimeCallback: null, // function to call when out of time
      interval: null,
      prevTime: null,
      synchronizing: false,
      syncCounter: 0,  // counter used to limit number of pending getRemainingTime requests

      setTotalTime: function (totalTime) {
         this.totalTime = totalTime;
      },

      init: function (isTimed, initialRemainingSeconds, ended, contestOverCallback, endTimeCallback) {
         this.initialRemainingSeconds = parseInt(initialRemainingSeconds);
         this.ended = ended;
         this.endTimeCallback = endTimeCallback;
         var curDate = new Date();
         this.timeStart = curDate.getTime() / 1000;
         if (this.ended) {
            contestOverCallback();
         } else if (isTimed) {
            this.prevTime = this.timeStart;
            this.updateTime();
            this.interval = setInterval(this.updateTime, 1000);
            this.minuteInterval = setInterval(this.minuteIntervalHandler, 60000);
         } else {
            $(".header_time").hide(); // common for both old+new interfaces
         }
      },

      getRemainingSeconds: function () {
         var curDate = new Date();
         var curTime = curDate.getTime() / 1000;
         var usedSeconds = (curTime - this.timeStart);
         var remainingSeconds = this.initialRemainingSeconds - usedSeconds;
         if (remainingSeconds < 0) {
            remainingSeconds = 0;
         }
         return remainingSeconds;
      },

      // fallback when sync with server fails:
      simpleTimeAdjustment: function () {
         var curDate = new Date();
         var timeDiff = curDate.getTime() / 1000 - TimeManager.prevTime;
         TimeManager.timeStart += timeDiff - 1;
         setTimeout(function () {
            TimeManager.syncWithServer();
         }, 120000);
      },

      syncWithServer: function () {
         if (this.syncCounter >= 1) {
            //console.log('ignored spurious call to syncWithServer');
            return;
         }
         this.syncCounter += 1;
         TimeManager.synchronizing = true;
         // common selector, edits many places
         $(".minutes").html('');
         $(".seconds").html('synchro...');
         var self = this;
         $.post('data.php', {SID: window.SID, action: 'getRemainingSeconds', teamID: teamID},
            function (data) {
               if (data.success) {
                  var remainingSeconds = self.getRemainingSeconds();
                  TimeManager.timeStart = TimeManager.timeStart + parseInt(data.remainingSeconds) - remainingSeconds;
                  /*
                  var curDate = new Date();
                  var curTime = curDate.getTime() / 1000;
                  console.log("remainingSeconds before sync : " + remainingSeconds + " timeStart : " + TimeManager.timeStart);
                  TimeManager.timeStart = curTime - (TimeManager.initialRemainingSeconds - parseInt(data.remainingSeconds));
                  remainingSeconds = self.getRemainingSeconds();
                  console.log("remainingSeconds after sync : " + remainingSeconds + " timeStart : " + TimeManager.timeStart);
                  this.prevTime = curTime;
                  */
               } else {
                  TimeManager.simpleTimeAdjustment();
               }
            },
            'json').done(function () {
               var curDate = new Date();
               TimeManager.prevTime = curDate.getTime() / 1000;
               TimeManager.synchronizing = false;
            }).fail(function () {
               TimeManager.simpleTimeAdjustment();
               TimeManager.synchronizing = false;
            });
      },

      minuteIntervalHandler: function () {
         TimeManager.syncCounter = 0;
      },

      updateTime: function () {
         if (TimeManager.ended || TimeManager.synchronizing) {
            return;
         }
         var curDate = new Date();
         var curTime = curDate.getTime() / 1000;
         var timeDiff = Math.abs(curTime - TimeManager.prevTime);
         // We traveled through time, more than 60s difference compared to 1 second ago !
         if (timeDiff > 60 || timeDiff < -60) {
            TimeManager.syncWithServer();
            return;
         }
         TimeManager.prevTime = curTime;
         var remainingSeconds = TimeManager.getRemainingSeconds();
         var minutes = Math.floor(remainingSeconds / 60);
         var seconds = Math.floor(remainingSeconds - 60 * minutes);
         $(".minutes").html(minutes);
         $(".seconds").html(Utils.pad2(seconds));
         if (remainingSeconds <= 0) {
            clearInterval(this.interval);
            clearInterval(this.minuteInterval);
            TimeManager.endTimeCallback();
         }
      },

      setEnded: function (ended) {
         this.ended = ended;
      },

      stopNow: function () {
         var curDate = new Date();
         this.ended = true;
      },

      isContestOver: function () {
         return this.ended;
      }
   };

   // Contest startup

   /*
    * Generates the html that displays the list of questions on the left side of the page
   */

   function fillListQuestions (sortedQuestionIDs, questionsData) {
      UI.OldListView.fillListQuestions(sortedQuestionIDs, questionsData, fullFeedback, scores);
      if (fullFeedback) {
         UI.OldContestHeader.updateCssFullfeedback();
         $(".question, #divQuestionParams, #divClosed, .questionsTable, #question-iframe-container").css("left", "245px");
      }
   }

   function fillListQuestionsNew (sortedQuestionIDs, questionsData) {
      UI.OldListView.fillListQuestionsNew(sortedQuestionIDs, questionsData, window.contestsRoot, contestFolder);
      updateUnlockedLevels(sortedQuestionIDs);
      for (iQuestionID = 0; iQuestionID < sortedQuestionIDs.length; iQuestionID++) {
         questionData = questionsData[sortedQuestionIDs[iQuestionID]];
         drawStars("score_" + questionData.key, 4, 20, getQuestionScoreRate(questionData), "normal", getNbLockedStars(questionData)); // stars under question icon
      }
      $("#divFooter").show();
   }

   function getQuestionScoreRate (questionData) {
      if (scores[questionData.key] !== undefined) {
         return scores[questionData.key].score / questionData.maxScore;
      }
      return 0;
   }

   function getNbLockedStars (questionData) {
      // TODO (here and everywhere in the code) : support variable number of
      // levels and hence of unlockedLevels
      if (questionUnlockedLevels[questionData.key] != 0) {
         return 3 - questionUnlockedLevels[questionData.key];
      }
      return 4;
   }

   function updateUnlockedLevels (sortedQuestionIDs, updatedQuestionKey, contestEnded) {
      if (!newInterface) {
         return;
      }
      var epsilon = 0.001;
      var nbTasksUnlocked = [nbUnlockedTasksInitial, 0, 0];
      var prevQuestionUnlockedLevels = {};
      var iQuestionID, questionKey;
      for (iQuestionID = 0; iQuestionID < sortedQuestionIDs.length; iQuestionID++) {
         questionKey = questionsData[sortedQuestionIDs[iQuestionID]].key;
         prevQuestionUnlockedLevels[questionKey] = questionUnlockedLevels[questionKey];
         //if (contestEnded) {
         questionUnlockedLevels[questionKey] = 4;
         nbTasksUnlocked[2]++;
         continue;
         //}
         /*
         questionUnlockedLevels[questionKey] = 0;
         if (scores[questionKey] != null) {
            var score = scores[questionKey].score;
            var maxScore = scores[questionKey].maxScore;
            if (score >= (maxScore / 2) - epsilon) {
               nbTasksUnlocked[0]++;
               nbTasksUnlocked[1]++;
               questionUnlockedLevels[questionKey] = 2;
            }
            if (score >= (3 * maxScore / 4) - epsilon) {
               nbTasksUnlocked[1]++;
               nbTasksUnlocked[2]++;
               questionUnlockedLevels[questionKey] = 3;
            }
            if (score >= maxScore - epsilon) {
               nbTasksUnlocked[2]++;
            }
         }
         */
      }
      for (iQuestionID = 0; iQuestionID < sortedQuestionIDs.length; iQuestionID++) {
         var questionData = questionsData[sortedQuestionIDs[iQuestionID]];
         questionKey = questionData.key;
         for (var iLevel = 0; iLevel < 3; iLevel++) {
            if (nbTasksUnlocked[iLevel] > 0) {
               if (questionUnlockedLevels[questionKey] < iLevel + 1) {
                  questionUnlockedLevels[questionKey] = iLevel + 1;
               }
               nbTasksUnlocked[iLevel]--;
            }
         }
         UI.GridView.unlockLevel(questionKey, questionUnlockedLevels[questionKey] == 0);

         if ((questionKey == updatedQuestionKey) ||
            (prevQuestionUnlockedLevels[questionKey] != questionUnlockedLevels[questionKey])) {
            var nbLocked = getNbLockedStars(questionData);
            var scoreRate = getQuestionScoreRate(questionData);
            drawStars('score_' + questionData.key, 4, 20, scoreRate, "normal", nbLocked);  // stars under icon on main page
            if (questionKey == updatedQuestionKey) {
               drawStars('questionStars', 4, 24, scoreRate, "normal", nbLocked); // stars in question title
               drawStars('questionIframeStars', 4, 24, scoreRate, "normal", nbLocked); // stars in question title
            }
         }
      }
   }

   function startContestTime (data) {
      $.post("data.php", {SID: window.SID, action: "startTimer", teamID: teamID},
         function (dataStartTimer) {
            var contestData = {
               ended: dataStartTimer.ended,
               remainingSeconds: dataStartTimer.remainingSeconds,
               questionsData: data.questionsData,
               scores: data.scores,
               answers: data.answers,
               isTimed: data.isTimed,
               teamPassword: data.teamPassword
            };
            setupContest(contestData);
         },
         "json"
      );
   }

   /*
    * Setup of the contest when the group has been selected, contestants identified,
    * the team's password given to the students, and the images preloaded
   */
   function setupContest (data) {
      teamPassword = data.teamPassword;
      questionsData = data.questionsData;

      var questionKey;
      // Reloads previous scores to every question
      scores = {};
      for (var questionID in data.scores) {
         if (questionID in questionsData) {
            questionKey = questionsData[questionID].key;
            scores[questionKey] = {score: data.scores[questionID], maxScore: questionsData[questionID].maxScore};
         }
      }
      if (fullFeedback) {
         computeFullFeedbackScore();
      }

      // Determines the order of the questions, and displays them on the left
      var sortedQuestionIDs = getSortedQuestionIDs(questionsData);
      if (newInterface) {
         fillListQuestionsNew(sortedQuestionIDs, questionsData);
         if ((customIntro != null) && (customIntro != '')) {
            UI.GridView.updateQuestionListIntro(customIntro);
         }
      } else {
         fillListQuestions(sortedQuestionIDs, questionsData);
      }
      updateUnlockedLevels(sortedQuestionIDs, null, data.ended);

      // Defines function to call if students try to close their browser or tab
      window.onbeforeunload = function () {
         return t("warning_confirm_close_contest");
      };

      // Map question key to question id array
      for (questionID in questionsData) {
         questionsKeyToID[questionsData[questionID].key] = questionID;
      }

      // Displays the first question
      var questionData = questionsData[sortedQuestionIDs[0]];
      // We don't want to start the process of selecting a question, if the grading is going to start !

      if (!newInterface) {
         window.selectQuestion(sortedQuestionIDs[0], false, data.ended && !fullFeedback);
      }

      // Reloads previous answers to every question
      answers = {};
      for (questionID in data.answers) {
         if (questionID in questionsData) {
            questionKey = questionsData[questionID].key;
            answers[questionKey] = data.answers[questionID];
            markAnswered(questionKey, answers[questionKey]);
            hasAnsweredQuestion = true;
         }
      }

      $('.buttonClose').show();

      // Starts the timer
      TimeManager.init(
         data.isTimed,
         data.remainingSeconds,
         data.ended,
         function () {
            closeContest(t("contest_is_over"));
         },
         function () {
            closeContest("<b>" + t("time_is_up") + "</b>");
         }
      );
   }

   /*
    * Loads contest's css and js files,
    * then preloads all contest images
    * then gets questions data from the server if groupPassword and teamID are valid,
    * then loads contest html file
    * then calls setupContest
    * if temID/password are incorrect, this means we're in the middle of re-login after an interruption
    * and the password provided is incorrect
   */
   window.loadContestData = function (_contestID, _contestFolder, _groupPassword) {
      if (_contestID === null) {
         _contestID = contestID;
      }
      if (_contestFolder === null) {
         _contestFolder = contestFolder;
      }
      if (_groupPassword === null) {
         _groupPassword = groupPassword;
      }
      $('#browserAlert').hide();
      UI.LoadingPage.load();
      questionIframe.initialize(function () {
         if (fullFeedback) {
            $.post("graders.php", {SID: SID, ieMode: window.ieMode, teamID: teamID, groupPassword: _groupPassword, p: getParameterByName('p')}, function (data) {
               if (data.status === 'success' && (data.graders || data.gradersUrl)) {
                  questionIframe.gradersLoaded = true;
                  UI.GridView.updateGradersContent(data);
               }
               if (data.status == 'success') {bonusScore = parseInt(data.bonusScore);}
            }, 'json');
         }
         // The callback will be used by the task
         questionIframe.iframe.contentWindow.ImagesLoader.setCallback(function () {
            UI.MainHeader.unload();
            updateDivQuestionsVisibility(true);
            if (fullFeedback) {
               UI.OldContestHeader.updateFeedbackVisibility(true);
            }
            UI.TaskFrame.showQuestionIframe();
            UI.LoadingPage.unload();

            $.post("data.php", {SID: window.SID, action: "loadContestData", groupPassword: _groupPassword, teamID: teamID},
               function (data) {
                  if (!data.success) {
                     UI.MainHeader.load();
                     UI.TrainingContestSelection.load();
                     UI.RestartContestForm.updateReloginResult(t("invalid_password"));
                     updateDivQuestionsVisibility(false);
                     UI.OldContestHeader.updateFeedbackVisibility(false);
                     UI.NavigationTabs.load();
                     Utils.enableButton("buttonRelogin");
                     return;
                  }
                  UI.TrainingContestSelection.unload();
                  UI.NavigationTabs.unload();

                  function oldLoader () {
                     $.get(window.contestsRoot + '/' + _contestFolder + "/contest_" + _contestID + ".html", function (content) {
                        UI.GridView.updateQuestionContent(content);
                        startContestTime(data);
                     });
                  }

                  function newLoader () {
                     var loader = new Loader(window.contestsRoot + '/' + _contestFolder + '/', UI.OldListView.log_fn);
                     loader.run().done(function (content) {
                        UI.GridView.updateQuestionContent(content);
                        startContestTime(data);
                     }).fail(function () {
                        oldLoader();
                     });
                  }

                  // XXX: select loader here
                  newLoader();

               }, "json");
         });

         questionIframe.iframe.contentWindow.ImagesLoader.preload(_contestFolder);
      });
   }

   window.groupWasChecked = function (data, curStep, groupCode, getTeams, isPublic, contestID) {
      initContestData(data, contestID);
      UI.MainHeader.updateSubTitle(data.name);
      UI.MainHeader.updateLoginLinkVisibility(false);
      if (data.teamID !== undefined) { // The password of the team was provided directly
         $("#div" + curStep).hide();
         teamID = data.teamID;
         teamPassword = groupCode;
         window.loadContestData(contestID, contestFolder);
      } else {
         if ((data.nbMinutesElapsed > 30) && (!data.isPublic) && (!data.isGenerated) && (!getTeams)) {
            if (parseInt(data.bRecovered)) {
               alert(t("group_session_expired"));
               //window.location = t("contest_url");
               return false;
            } else {
               UI.TrainingContestSelection.load();
               UI.GroupUsedForm.load();
               return false;
            }
         }
         $("#div" + curStep).hide();
         UI.PersonalDataForm.hideLoginFields(data);
         if (curStep === "CheckGroup") {
            UI.PersonalDataForm.updateLoginForm(isPublic, data);
            UI.NavigationTabs.unload();
         } else {
            /*
            * Fills a select field with all the names of the teams (of a given group)
            * Used to continue a contest if the students didn't write down the team password
            */
            UI.RestartContestForm.fillListTeams(data.teams);
            UI.NavigationTabs.load();
            UI.RestartContestForm.updateDivReloginVisibility(true);
         }
      }
   };

   /*
    * Checks if a group is valid and loads information about the group and corresponding contest,
    * curStep: indicates which step of the login process the students are currently at :
    *   - "CheckGroup" if loading directly from the main page (public contest or group code)
    *   - "Interrupted" if loading from the interface used when continuing an interupted contest
    * groupCode: a group code, or a team password
    * isPublic: is this a public group ?
   */
   window.checkGroupFromCode = function (curStep, groupCode, getTeams, isPublic, language, startOfficial) {
      Utils.disableButton("button" + curStep);
      UI.GroupUsedForm.unload();
      $('#browserAlert').hide();
      $("#" + curStep + "Result").html('');
      $.post("data.php", {SID: window.SID, action: "checkPassword", password: groupCode, getTeams: getTeams, language: language, startOfficial: startOfficial, commonJsVersion: commonJsVersion, timestamp: window.timestamp, commonJsTimestamp: commonJsTimestamp},
         function (data) {
            if (!data.success) {
               if (data.message) {
                  $("#" + curStep + "Result").html(data.message);
               } else {
                  $("#" + curStep + "Result").html(t("invalid_code"));
               }
               return;
            } else {
               UI.StartContestForm.slideUp();
            }
            UI.NavigationTabs.unload();
            UI.MainHeader.updateLoginLinkVisibility(false);
            $("#div" + curStep).hide();

            UI.SubcontestSelectionInterface.childrenContests = data.childrenContests;
            groupCheckedData = {
               data: data,
               curStep: curStep,
               groupCode: groupCode,
               getTeams: getTeams,
               isPublic: data.isPublic
            };


            if ((data.registrationData != undefined) && (!data.isOfficialContest)) {
               UI.PersonalData.showPersonalPage(data);
               return;
            }
            UI.MainHeader.updateTitle(data.contestName);

            UI.SubcontestSelectionInterface.groupMinCategory = data.minCategory;
            UI.SubcontestSelectionInterface.groupMaxCategory = data.maxCategory;
            UI.SubcontestSelectionInterface.groupLanguage = data.language;

            if (data.allContestsDone) {
               $("#" + curStep).hide();
               UI.AllContestsDone.load();
               return;
            }

            if ((!getTeams) && (data.childrenContests != undefined) && (data.childrenContests.length != 0)) {
               $("#" + curStep).hide();
               $('#divAccessContest').show();
               UI.SubcontestSelectionInterface.offerCategories(data);
            } else {
               window.groupWasChecked(data, curStep, groupCode, getTeams, data.isPublic);
            }
         }, "json").done(function () {Utils.enableButton("button" + curStep);});
   };


   //related to UI.SubcontestSelectionInterface
   window.selectContest = function (ID) {
      $("#selectContest").delay(250).slideUp(400).queue(function () {
         $(this).dequeue();
         if (window.browserIsMobile && typeof scratchToBlocklyContestID[ID] != 'undefined') {
            alert(t("browser_redirect_scratch_to_blockly"));
            ID = scratchToBlocklyContestID[ID];
            UI.SubcontestSelectionInterface.selectedLanguage = 'blockly';
            UI.Breadcrumbs.updateBreadcrumb();
         }
         var contest = window.getContest(ID);
         contestID = ID;
         contestFolder = contest.folder;
         customIntro = contest.customIntro;
         groupCheckedData.data.allowTeamsOfTwo = contest.allowTeamsOfTwo;
         groupCheckedData.data.askParticipationCode = contest.askParticipationCode;
         window.groupWasChecked(groupCheckedData.data, groupCheckedData.curStep, groupCheckedData.groupCode, groupCheckedData.getTeams, groupCheckedData.isPublic, contestID);
      });
   }

   /*
    * Creates a new team using contestants information
   */
   window.createTeam = function (contestants) {
      if (window.browserIsMobile && typeof scratchToBlocklyContestID[contestID] != 'undefined') {
         alert(t("browser_redirect_scratch_to_blockly"));
         contestID = scratchToBlocklyContestID[contestID];
         var contest = window.getContest(contestID);
         contestFolder = contest.folder;
         customIntro = contest.customIntro;
      }
      $.post("data.php", {SID: window.SID, action: "createTeam", contestants: contestants, contestID: contestID},
         function (data) {
            teamID = data.teamID;
            teamPassword = data.password;
            UI.PersonalDataForm.unload();
            $("#divAccessContest").hide();
            UI.PersonalData.updateTeamPassword(data.password);
            UI.PersonalData.updateVisibilityPassword(true);
         }, "json");
   }

   window.setTeamID = function (_teamID) {
      teamID = _teamID;
   }

   /*
    * Generates the html for the list of public groups
   */
   // function getPublicGroupsList (groups) {
   //    var arrGroups = {};
   //    var years = {};
   //    var categories = {};
   //    var year, group, category;
   //    var maxYear = 0;
   //    for (var iGroup = 0; iGroup < groups.length; iGroup++) {
   //       group = groups[iGroup];
   //       if (!arrGroups[group.level]) {
   //          arrGroups[group.level] = {};
   //       }
   //       year = group.year % 10000;
   //       arrGroups[group.level][group.category] = group;
   //       years[year] = true;
   //       if (!categories[year]) {
   //          categories[year] = {};
   //       }
   //       categories[year][group.category] = true;
   //       maxYear = Math.max(maxYear, year);
   //    }
   //    var levels = [
   //       {name: t("level_1_name"), i18name: "level_1_name", id: 1},
   //       {name: t("level_2_name"), i18name: "level_2_name", id: 2},
   //       {name: t("level_3_name"), i18name: "level_3_name", id: 3},
   //       {name: t("level_4_name"), i18name: "level_4_name", id: 4},
   //       {name: t("level_all_questions_name"), i18name: "level_all_questions_name", id: 0}
   //    ];
   //    var strGroups = "<table style='border:solid 1px black; border-collapse:collapse;' cellspacing=0 cellpadding=5>";
   //    for (year = maxYear; years[year] === true; year--) {
   //       for (category in categories[year]) {
   //          var nbGroupsInCategory = 0;
   //          var thisCategoryStrGroup = '';
   //          strGroups += "<tr class='groupRow'><td style='width:100px;border:solid 1px black;text-align:center'><b>" + category + "</b></td>";
   //          for (var iLevel = 0; iLevel < levels.length; iLevel++) {
   //             var level = levels[iLevel];
   //             group = undefined;
   //             if (arrGroups[level.id]) {
   //                group = arrGroups[level.id][category];
   //             }
   //             if (group) {
   //                thisCategoryStrGroup += "<td style='width:100px;border:solid 1px black;text-align:center'>" +
   //                   "<a href='#' onclick='checkGroupFromCode(\"CheckGroup\", \"" + group.code + "\", false, true)' data-i18n=\"[html]" + level.i18name + "\"> " + level.name + "</a></td>";
   //                nbGroupsInCategory = nbGroupsInCategory + 1;
   //             } else {
   //                thisCategoryStrGroup += "<td width=20%></td>";
   //             }
   //          }
   //          if (nbGroupsInCategory == 1 && arrGroups[0] && arrGroups[0][category]) {
   //             group = arrGroups[0][category];
   //             thisCategoryStrGroup = "<td colspan=\"5\" style='width:500px;border:solid 1px black;text-align:center'>" +
   //                "<a href='#' onclick='checkGroupFromCode(\"CheckGroup\", \"" + group.code + "\", false, true)' data-i18n=\"[html]level_all_levels_name\"> " + t("level_all_levels_name") + "</a></td>";
   //          }
   //          strGroups = strGroups + thisCategoryStrGroup;
   //          strGroups += "</tr>";
   //       }
   //    }
   //    strGroups += "</table>";
   //    return strGroups;
   // }

   function initContestData (data, newContestID) {
      if (newContestID == null) {
         contestID = data.contestID;
         contestFolder = data.contestFolder;
         customIntro = $("<textarea/>").html(data.customIntro).text();
      }
      UI.MainHeader.updateTitle(data.contestName);
      fullFeedback = parseInt(data.fullFeedback);
      nextQuestionAuto = parseInt(data.nextQuestionAuto);
      nbUnlockedTasksInitial = parseInt(data.nbUnlockedTasksInitial);
      newInterface = !!parseInt(data.newInterface);
      customIntro = $("<textarea/>").html(data.customIntro).text();
      contestOpen = !!parseInt(data.contestOpen);
      contestVisibility = data.contestVisibility;
      contestShowSolutions = !!parseInt(data.contestShowSolutions);
      if (newInterface) {
         UI.TaskFrame.showNewInterface();
         UI.OldContestHeader.unload();
         UI.ContestHeader.load();
         window.backToList(true);
      } else {
         UI.TaskFrame.showOldInterface();
         UI.ContestHeader.unload();
         UI.OldContestHeader.load();
      }
   }

   /*
    * Loads all the information about a session if a session is already opened
    * Otherwise, displays the list of public groups.
   */
   function loadSession () {
      $.post("data.php", {SID: window.SID, action: 'loadSession'},
         function (data) {
            window.SID = data.SID;
            if (data.teamID) {
               if (!confirm(data.message)) { // t("restart_previous_contest") json not loaded yet!
                  destroySession();
                  return;
               }
               teamID = data.teamID;
               initContestData(data);
               UI.TrainingContestSelection.unload();
               window.loadContestData(contestID, contestFolder);
               return;
            }
         }, "json");
   }

   function destroySession () {
      window.SID = null; // are we sure about that?
      $.post("data.php", {action: 'destroySession'},
         function (data) {
            window.SID = data.SID;
         }, "json");
   }

   // is used? no references
   // function loadPublicGroups() {
   //    $.post("data.php", {action: 'loadPublicGroups'},
   //       function(data) {
   //            //$("#classroomGroups").show();
   //          if ((data.groups.length !== 0) && (data.groups.length < 10)) { // Temporary limit for fr platform
   //             $("#listPublicGroups").html(getPublicGroupsList(data.groups));
   //          }
   //          $("#contentPublicGroups").show();
   //          $("#loadPublicGroups").hide();
   //       }, 'json');
   // }

   // Obtain an association array describing the parameters passed to page
   function getPageParameters () {
      var str = window.location.search.substr(1);
      var params = {};
      if (str) {
         var items = str.split("&");
         for (var idItem = 0; idItem < items.length; idItem++) {
            var tmp = items[idItem].split("=");
            params[tmp[0]] = decodeURIComponent(tmp[1]);
         }
      }
      return params;
   }

   /*
    * Initialisation
    * Cleans up identification form (to avoid auto-fill for some browser)
    * Inits ajax error handler
    * Loads current session or list of public groups
   */
   function init () {
      for (var contestant = 1; contestant <= 2; contestant++) {
         UI.PersonalDataForm.initContestant(contestant);
      }
      initErrorHandler();
      loadSession();
      // Load initial tab according to parameters
      var params = getPageParameters();
      if (params.tab)
         window.selectMainTab(params.tab);
   }

   /*
    * Called when a student clicks on the button to stop before the timer ends
   */
   window.tryCloseContest = function () {
      var remainingSeconds = TimeManager.getRemainingSeconds();
      var nbMinutes = Math.floor(remainingSeconds / 60);
      if (nbMinutes > 1) {
         if (!confirm(t("time_remaining_1") + nbMinutes + t("time_remaining_2"))) {
            return;
         }
         if (!confirm(t("confirm_stop_early"))) {
            return;
         }
      }
      closeContest(t("thanks_for_participating"));
   };

   /*
    * Called when the contest is over, whether from the student's action,
    * or the timer is expired (either right now or was expired before being loaded
    *
    * If some answers are still waiting to be sent to the server, displays a message that
    * says to wait for 20 seconds. If the answers could still not be send, end the contest
    * anyway. finalCloseContest will offer a backup solution, but the app will keep trying
    * to send them automatically as long as the page is stays opened.
   */
   function closeContest (message) {
      hasDisplayedContestStats = true;
      Utils.disableButton("buttonClose");
      Utils.disableButton("buttonCloseNew");
      $('body').removeClass('autoHeight');
      window.toggleMetaViewport(false);
      updateDivQuestionsVisibility(false);
      UI.TaskFrame.hideQuestionIframe();
      if (questionIframe.task) {
         questionIframe.task.unload(function () {
            doCloseContest(message);
         }, function () {
            logError(arguments);
            doCloseContest(message);
         });
      } else {
         doCloseContest(message);
      }
   }

   function doCloseContest (message) {
      UI.MainHeader.load();
      UI.ContestEndPage.load();
      if ($.isEmptyObject(answersToSend)) {
         Tracker.trackData({send: true});
         Tracker.disabled = true;
         finalCloseContest(message);
      } else {
         UI.ContestEndWaitingPage.load();
         delaySendingAttempts = 10000;
         sendAnswers();
         setTimeout(function () {
            finalCloseContest(message);
         }, 22000);
      }
   }

   /*
    * Called when a team's participation is over
    * For a restricted contest, if shows a message reminding the students of
    * their team password, and suggesting them to go learn more on france-ioi.org;
    * if some answers have not been sent due to connexion problem, displays an
    * encoded version of the answers, and asks students to send that text to us
    * by email whenever they can.
    * If the contest is not resticted, show the team's scores
   */
   function finalCloseContest (message) {
      TimeManager.stopNow();
      $.post("data.php", {SID: window.SID, action: "closeContest", teamID: teamID, teamPassword: teamPassword},
         function () {}, "json"
      ).always(function () {
         window.onbeforeunload = function () {};
         if (!contestShowSolutions) {
            UI.ContestEndWaitingPage.unload();
            UI.ContestEndPage.updateClosedMessage(message);
            var listAnswers = [];
            for (var questionID in answersToSend) {
               var answerObj = answersToSend[questionID];
               listAnswers.push([questionID, answerObj.answer]);
            }
            if (listAnswers.length !== 0) {
               var encodedAnswers = base64_encode(JSON.stringify({pwd: teamPassword, ans: listAnswers}));
               UI.ContestQuestionRecoveryPage.updateEncodedAnswers(encodedAnswers);
               UI.ContestQuestionRecoveryPage.load();
               // Attempt to send the answers payload to a backup server by adding
               // an image to the DOM.
               var img = document.createElement('img');
               $('body').append($('<img>', {
                  width: 1, height: 1, 'class': 'hidden',
                  src: 'http://castor.epixode.fr/?q=' + encodeURIComponent(encodedAnswers)
               }));
            }
            UI.RecoveryPasswordReminder.updateTeamPassword(teamPassword);
            UI.RecoveryPasswordReminder.load();
            if (fullFeedback) {
               UI.RecoveryPasswordReminder.updateTeamScore(ffTeamScore);
               UI.RecoveryPasswordReminder.showScoreReminder();
            }
         } else {
            updateDivQuestionsVisibility(false);
            UI.TaskFrame.hideQuestionIframe();
            UI.LoadingPage.load();
            UI.MainHeader.load();

            showScoresHat();
            if (newInterface) {
               var sortedQuestionIDs = getSortedQuestionIDs(questionsData);
               updateUnlockedLevels(sortedQuestionIDs, null, true);
               UI.GridView.updateQuestionListIntro('<p>' + t('check_score_detail') + '</p>');
               UI.GridView.resetHeaderTime();
            }
         }
      });
   }


   /*
    * Called when the team's contest participation is over, and it's not
    * a "restricted" contest.
    * Computes the scores for each question using the task's graders
    * the score for each question as well as the total score.
    * Send the scores to the server, then display the solutions
   */
   function showScoresHat () {
      // in case of fullFeedback, we don't need other graders
      if (fullFeedback) {
         showScores({bonusScore: bonusScore});
         return;
      }
      $.post("graders.php", {SID: SID, ieMode: window.ieMode, p: getParameterByName('p')}, function (data) {
         if (data.status === 'success' && (data.graders || data.gradersUrl)) {
            questionIframe.gradersLoaded = true;
            if (data.graders) {
               UI.GridView.updateGradersContent(data.graders);
               showScores(data);
            } else {
               $.get(data.gradersUrl, function (content) {
                  UI.GridView.updateGradersContent(content);
                  showScores(data);
               }).fail(function () {
                  logError('cannot find ' + data.gradersUrl);
                  showScores({bonusScore: bonusScore});
               });
            }
         }
      }, 'json');
   }

   function showScores (data) {
      $(".scoreTotal").hide();
      // Compute scores
      teamScore = parseInt(data.bonusScore);
      maxTeamScore = parseInt(data.bonusScore);
      for (var questionID in questionsData) {
         var questionData = questionsData[questionID];
         var questionKey = questionData.key;
         var answer = answers[questionKey];
         var minScore = questionData.minScore;
         var noAnswerScore = questionData.noAnswerScore;
         var maxScore = questionData.maxScore;
         if (answer) {
            // Execute the grader in the question context
            questionsToGrade.push({
               answer: answer,
               minScore: minScore,
               maxScore: maxScore,
               noScore: questionData.noAnswerScore,
               options: questionData.options,
               questionKey: questionKey
            });
         }
         else {
            // No answer given
            scores[questionKey] = {
               score: noAnswerScore,
               maxScore: maxScore
            };
            teamScore += parseInt(scores[questionKey].score);
         }
         maxTeamScore += parseInt(maxScore);
      }
      gradeQuestion(0);
   }

   // Grade the i'est question, then call the (i+1)'est or send the score
   function gradeQuestion (i) {
      if (i >= questionsToGrade.length) {
         sendScores();
         return;
      }

      var curQuestion = questionsToGrade[i];

      questionIframe.load({'task': true, 'grader': true}, curQuestion.questionKey, function () {
         questionIframe.task.gradeAnswer(curQuestion.answer, null, function (newScore, message) {
            scores[curQuestion.questionKey] = {
               score: newScore,
               maxScore: curQuestion.maxScore
            };
            teamScore += parseInt(scores[curQuestion.questionKey].score);
            gradeQuestion(i + 1);
         });
      });
   }

   // Send the computed scores, then load the solutions
   function sendScores () {
      $.post('scores.php', {scores: scores, SID: window.SID}, function (data) {
         if (data.status === 'success') {
            loadSolutionsHat();
            if (bonusScore) {
               UI.OldContestHeader.updateBonusScore(bonusScore);
            }
            $(".questionScore").css("width", "50px");
            $(".question, #divClosed").css("left", "272px");
            UI.OldContestHeader.updateCssLoadSolutions();
            var sortedQuestionIDs = getSortedQuestionIDs(questionsData);
            for (var iQuestionID = 0; iQuestionID < sortedQuestionIDs.length; iQuestionID++) {
               var questionID = sortedQuestionIDs[iQuestionID];
               var questionKey = questionsData[questionID].key;
               var image = "";
               var score = 0;
               var maxScore = 0;
               if (scores[questionKey] !== undefined) {
                  score = scores[questionKey].score;
                  maxScore = scores[questionKey].maxScore;
                  if (score < 0) {
                     image = "<img src='images/35.png'>";
                  } else if (score == maxScore) {
                     image = '<span class="check">✓</span>';
                  } else if (parseInt(score) > 0) {
                     image = "<img src='images/check.png'>";
                  } else {
                     image = "";
                  }
               }
               if (!newInterface) {
                  UI.OldContestHeader.updateBulletAndScores(questionKey, image, score, maxScore);
               }
            }
            $(".scoreTotal").hide();
            UI.OldContestHeader.updateTeamScore(teamScore, maxTeamScore);
            //      window.selectQuestion(sortedQuestionIDs[0], false);
         }
      }, 'json');
   }

   // Questions tools

   function getSortedQuestionIDs (questionsData) {
      var questionsByOrder = {};
      var orders = [];
      var order;
      for (var questionID in questionsData) {
         var questionData = questionsData[questionID];
         order = parseInt(questionData.order);
         if (questionsByOrder[order] === undefined) {
            questionsByOrder[order] = [];
            orders.push(order);
         }
         questionsByOrder[order].push(questionID);
      }
      orders.sort(function (order1, order2) {
         if (order1 < order2) {
            return -1;
         }
         return 1;
      });
      var sortedQuestionsIDs = [];
      // teamID is a string representing a very long integer, let's take only the 5 last digits:
      var baseOrderKey = parseInt(teamID.slice(-5));
      for (var iOrder = 0; iOrder < orders.length; iOrder++) {
         order = orders[iOrder];
         questionsByOrder[order].sort(function (id1, id2) {if (id1 < id2) return -1; return 1;});
         var shuffledOrder = Utils.getShuffledOrder(questionsByOrder[order].length, baseOrderKey + iOrder);
         for (var iSubOrder = 0; iSubOrder < shuffledOrder.length; iSubOrder++) {
            var subOrder = shuffledOrder[iSubOrder];
            sortedQuestionsIDs.push(questionsByOrder[order][subOrder]);
         }
      }
      fillNextQuestionID(sortedQuestionsIDs);
      return sortedQuestionsIDs;
   }

   function fillNextQuestionID (sortedQuestionsIDs) {
      var prevQuestionID = "0";
      for (var iQuestion = 0; iQuestion < sortedQuestionsIDs.length; iQuestion++) {
         var questionID = sortedQuestionsIDs[iQuestion];
         if (prevQuestionID !== "0") {
            questionsData[prevQuestionID].nextQuestionID = questionID;
         }
         prevQuestionID = questionID;
      }
      questionsData[prevQuestionID].nextQuestionID = "0";
   }

   window.selectQuestion = function (questionID, clicked, noLoad) {
      // Prevent double-click until we fix the issue with timeouts
      var curTime = (new Date()).getTime();
      if (curTime - lastSelectQuestionTime < 1000) {
         if (curTime - lastSelectQuestionTime < 0) {
            // in case the computer time changes during the contest, we reset lastSelectQuestionTime, to make sure the user doesn't get stuck
            lastSelectQuestionTime = curTime;
         } else {
            return;
         }
      }
      lastSelectQuestionTime = curTime;
      $("body").scrollTop(0);
      try {
         if (document.getSelection) {
            var selection = document.getSelection();
            if (selection && selection.removeAllRanges) {
               selection.removeAllRanges();
            }
         }
      } catch (err) {}
      var questionData = questionsData[questionID];
      questionData.visited = true;
      var questionKey = questionData.key;

      if (newInterface) {
         UI.GridView.unload();
         UI.OldListView.updateButtonCloseVisibility(false);
         UI.TaskFrame.load();
         // $(".questionIframeLoading").show();
         UI.ContestHeader.updateButtonReturnListEnability(false);
      }

      var nextStep = function () {
         Tracker.trackData({dataType: "selectQuestion", teamID: teamID, questionKey: questionKey, clicked: clicked});
         var questionName = questionData.name.replace("'", "&rsquo;").split("[")[0];
         var minScore = questionData.minScore;
         var maxScore = questionData.maxScore;
         var noAnswerScore = questionData.noAnswerScore;
         $("#question-" + currentQuestionKey).hide();
         $("#question-" + questionKey).show();
         $("#link_" + currentQuestionKey).attr("class", "questionLink");
         $("#link_" + questionKey).attr("class", "questionLinkSelected");
         if (!fullFeedback) {
            UI.OldListView.updateQuestionPoints("<table class='questionScores' cellspacing=0><tr><td>" + t("no_answer") + "</td><td>" + t("bad_answer") + "</td><td>" + t("good_answer") + "</td></tr>" +
               "<tr><td><span class='scoreNothing'>" + noAnswerScore + "</span></td>" +
               "<td><span class='scoreBad'>" + minScore + "</span></td>" +
               "<td><span class='scoreGood'>+" + maxScore + "</span></td></tr></table>");
         }
         $(".questionTitle").html(questionName);
         if (newInterface) {
            drawStars('questionStars', 4, 24, getQuestionScoreRate(questionData), "normal", getNbLockedStars(questionData)); // stars under icon on main page
            drawStars('questionIframeStars', 4, 24, getQuestionScoreRate(questionData), "normal", getNbLockedStars(questionData)); // stars under icon on main page
         }
         currentQuestionKey = questionKey;

         if (!questionIframe.initialized) {
            questionIframe.initialize();
         }
         var taskViews = {"task": true};
         if (questionIframe.gradersLoaded || fullFeedback) {
            taskViews.grader = true;
         }
         if (TimeManager.isContestOver()) {
            taskViews.solution = true;
         }
         if (!noLoad) {
            questionIframe.load(taskViews, questionKey, function () {});
         }
      };

      if (questionIframe.task) {
         questionIframe.task.getAnswer(function (answer) {
            if (!TimeManager.isContestOver() && ((answer !== defaultAnswers[questionIframe.questionKey]) || (typeof answers[questionIframe.questionKey] != 'undefined'))) {
               if (fullFeedback) {
                  platform.validate("stay", function () {
                     nextStep();
                  }, function () {
                     logError(arguments);
                  });
               } else if (((typeof answers[questionIframe.questionKey] == 'undefined') || (answers[questionIframe.questionKey] != answer))
                  && !confirm(t("confirm_leave_question"))) {
                  return;
               } else {
                  nextStep();
               }
            } else {
               nextStep();
            }
         }, function () {
            logError(arguments);
            nextStep();
         });
      } else {
         nextStep();
      }
   };

   function markAnswered (questionKey, answer) {
      if (newInterface) {
         return;
      }
      if (answer === "") {
         UI.GridView.updateBullet(questionKey, "");
      } else {
         if (fullFeedback && typeof scores[questionKey] !== 'undefined' && scores[questionKey].score == scores[questionKey].maxScore) {
            UI.GridView.updateBullet(questionKey, '<span class="check">✓</span>');
         } else {
            UI.GridView.updateBullet(questionKey, "&diams;");
         }
      }
   }

   function submitAnswer (questionKey, answer, score) {
      if (typeof answer !== 'string') {
         logError('trying to submit non-string answer: ' + answer);
         return;
      }
      if (!newInterface) {
         UI.GridView.updateBullet(questionKey, "&loz;");
      }
      answersToSend[questionsKeyToID[questionKey]] = {answer: answer, sending: false, 'score': score};
      nbSubmissions++;
      Tracker.trackData({dataType: "answer", teamID: teamID, questionKey: questionKey, answer: answer});
      sendAnswers();
   }

   function computeFullFeedbackScore () {
      ffTeamScore = bonusScore ? bonusScore : 0;
      ffMaxTeamScore = 0;
      for (var questionID in questionsData) {
         var questionKey = questionsData[questionID].key;
         ffMaxTeamScore += questionsData[questionID].maxScore;
         if (scores[questionKey]) {
            ffTeamScore += parseInt(scores[questionKey].score);
         } else {
            ffTeamScore += questionsData[questionID].noAnswerScore;
         }
      }
      if (newInterface) {
         var strScore = ffTeamScore + " ";
         if (ffTeamScore > 1) {
            strScore += t("points");
         } else {
            strScore += t("point");
         }
         UI.ContestHeader.updateScoreTotalFullFeedback(strScore);
      } else {
         UI.ContestHeader.updateScoreTotalFullFeedback(ffTeamScore + ' / ' + ffMaxTeamScore);
      }
   }

   // Sending answers

   function failedSendingAnswers () {
      Tracker.disabled = true;
      sending = false;
      for (var questionID in answersToSend) {
         answersToSend[questionID].sending = false;
      }
      setTimeout(sendAnswers, delaySendingAttempts);
   }

   function initErrorHandler () {
      // TODO: call on document for jquery 1.8+
      $("body").ajaxError(function (e, jqxhr, settings, exception) {
         if (settings.url == "answer.php") {
            failedSendingAnswers();
         } else {
            if ((exception === "") || (exception === "Unknown")) {
               if (confirm(t("server_not_responding_try_again"))) {
                  $.ajax(settings);
               }
            } else if (exception === "timeout") {
               UI.ContestEndPage.showError(t("exception") + exception + "<br/><br/>" + t("contest_load_failure"));
            } else {
               UI.ContestEndPage.showError(t("exception") + exception + "<br/><br/>" + t("server_output") + "<br/>" + jqxhr.responseText);
            }
         }
      });
   }

   function base64_encode (str) {
      return btoa(utf8.encode(str));
   }

   function base64url_encode (str) {
      return base64_encode(str).replace('+', '-').replace('/', '_');
   }

   function sendAnswers () {
      if (sending) {
         return;
      }
      sending = true;
      var somethingToSend = false;
      for (var questionID in answersToSend) {
         var answerObj = answersToSend[questionID];
         answerObj.sending = true;
         somethingToSend = true;
      }
      if (!somethingToSend) {
         sending = false;
         return;
      }
      try {
         $.post("answer.php", {SID: window.SID, "answers": answersToSend, teamID: teamID, teamPassword: teamPassword},
            function (data) {
               sending = false;
               if (!data.success) {
                  if (confirm(t("response_transmission_error_1") + " " + data.message + t("response_transmission_error_2"))) {
                     failedSendingAnswers();
                  }
                  return;
               }
               var answersRemaining = false;
               for (var questionID in answersToSend) {
                  var answerToSend = answersToSend[questionID];
                  if (answerToSend.sending) {
                     var questionKey = questionsData[questionID].key;
                     markAnswered(questionKey, answersToSend[questionID].answer);
                     delete answersToSend[questionID];
                  } else {
                     answersRemaining = true;
                  }
               }
               if (answersRemaining) {
                  setTimeout(sendAnswers, 1000);
               }
            }, "json").fail(failedSendingAnswers);
      } catch (exception) {
         failedSendingAnswers();
      }
   }

   // Solutions

   function loadSolutionsHat () {
      $.post('solutions.php', {SID: window.SID, ieMode: window.ieMode}, function (data) {
         if (data.success) {
            if (data.solutions) {
               UI.GridView.updateSolutionsContent(data.solutions);
               loadSolutions(data);
            } else {
               $.get(data.solutionsUrl, function (content) {
                  UI.GridView.updateSolutionsContent(content);
                  loadSolutions(data);
               }).fail(function () {
                  logError('a problem occured while fetching the solutions, please report to the administrators.');
                  updateDivQuestionsVisibility(true);
               });
            }
         }
      }, 'json');
   }

   function loadSolutions (data) {
      var sortedQuestionIDs = getSortedQuestionIDs(questionsData);
      for (var iQuestionID = 0; iQuestionID < sortedQuestionIDs.length; iQuestionID++) {
         var questionID = sortedQuestionIDs[iQuestionID];
         var questionData = questionsData[questionID];
         $("#question-" + questionData.key).append("<hr>" + $("#solution-" + questionData.key).html());
      }

      updateDivQuestionsVisibility(false);
      UI.TaskFrame.hideQuestionIframe();
      UI.LoadingPage.load();
      UI.MainHeader.load();

      // The callback will be used by the task
      if (questionIframe.iframe.contentWindow.preloadSolImages) {
         questionIframe.iframe.contentWindow.preloadSolImages();
      }
      setTimeout(function () {
         questionIframe.iframe.contentWindow.ImagesLoader.setCallback(function () {
            UI.MainHeader.unload();
            updateDivQuestionsVisibility(true);
            UI.TaskFrame.showQuestionIframe();
            UI.ContestEndPage.unload();
            $('#question-iframe-container').css('left', '273px');
            UI.LoadingPage.unload();
            if (!currentQuestionKey) {
               return;
            }
            questionIframe.updateHeight(function () {
               if (questionIframe.loaded) {
                  questionIframe.task.unload(function () {
                     questionIframe.loadQuestion({'task': true, 'solution': true, 'grader': true}, currentQuestionKey, function () {});
                  }, function () {
                     logError(arguments);
                     questionIframe.loadQuestion({'task': true, 'solution': true, 'grader': true}, currentQuestionKey, function () {});
                  });
               } else {
                  questionIframe.loadQuestion({'task': true, 'solution': true, 'grader': true}, currentQuestionKey, function () {});
               }
               alert(t("check_score_detail"));
            }, logError);
         });

         questionIframe.iframe.contentWindow.ImagesLoader.preload(contestFolder);
      }, 50);
   }

   var Tracker = {
      disabled: true,
      trackData: function (data) {
         if (Tracker.disabled) {
            return;
         }
         if (($("#trackingFrame").length > 0)) {
            $.postMessage(
               JSON.stringify(data),
               "http://eval02.france-ioi.org/castor_tracking/index.html",
               $("#trackingFrame")[0].contentWindow
            );
         }
      }
   };

   // TODO: is it still used?
   function htmlspecialchars_decode (string, quote_style) {
      var optTemp = 0;
      var i = 0;
      var noquotes = false;

      if (typeof quote_style === 'undefined') {
         quote_style = 2;
      }
      string = string.toString().replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      var OPTS = {
         'ENT_NOQUOTES': 0,
         'ENT_HTML_QUOTE_SINGLE': 1,
         'ENT_HTML_QUOTE_DOUBLE': 2,
         'ENT_COMPAT': 2,
         'ENT_QUOTES': 3,
         'ENT_IGNORE': 4
      };
      if (quote_style === 0) {
         noquotes = true;
      }
      if (typeof quote_style !== 'number') { // Allow for a single string or an array of string flags
         quote_style = [].concat(quote_style);
         for (i = 0; i < quote_style.length; i++) {
            // Resolve string input to bitwise e.g. 'PATHINFO_EXTENSION' becomes 4
            if (OPTS[quote_style[i]] === 0) {
               noquotes = true;
            }
            else if (OPTS[quote_style[i]]) {
               optTemp = optTemp | OPTS[quote_style[i]];
            }
         }
         quote_style = optTemp;
      }
      if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) {
         string = string.replace(/&#0*39;/g, "'"); // PHP doesn't currently escape if more than one 0, but it should
         // string = string.replace(/&apos;|&#x0*27;/g, "'"); // This would also be useful here, but not a part of PHP
      }
      if (!noquotes) {
         string = string.replace(/&quot;/g, '"');
      }
      // Put this in last place to avoid escape being double-decoded
      string = string.replace(/&amp;/g, '&');

      return string;
   }

   //
   // Loader
   //

   var Loader = function (base, log_fn) {
      this.log = log_fn;
      this.base = base;
      this.queue = [];
      this.parts = [];
      this.n_loaded = 0;
      this.n_total = 0;
   };
   Loader.prototype.version = 1.2;
   Loader.prototype.add = function (items) {
      this.queue = this.queue.concat(items);
      this.n_total += items.length;
   };
   Loader.prototype.assemble = function () {
      var self = this;
      self.log('A');
      setTimeout(function () {
         var data = self.parts.join('');
         for (var i = 0; i < window.config.imagesURLReplacements.length; i++) {
            data = data.replace(new RegExp(window.config.imagesURLReplacements[i][0], 'g'), window.config.imagesURLReplacements[i][1]);
         }
         if (window.config.upgradeToHTTPS) {
            if (window.config.upgradeToHTTPS.length) {
               for (var i = 0; i < window.config.upgradeToHTTPS.length; i++) {
                  var uthDomain = window.config.upgradeToHTTPS[i];
                  data = data.replace(new RegExp('http://' + uthDomain, 'g'), 'https://' + uthDomain);
               }
            } else {
               data = data.replace(/http:\/\//g, "https://");
            }
         }
         self.promise.resolve(data);
      }, 100);
   };
   Loader.prototype.load_next = function () {
      var self = this;
      if (self.queue.length === 0) {
         this.assemble();
      } else {
         var item = self.queue.shift();
         var url = self.base + item;
         self.start_time = new Date().getTime();
         $.ajax(self.base + item, {dataType: 'text', global: false}).done(function (data, textStatus, xhr) {
            try {
               var delta = new Date().getTime() - self.start_time;
               self.n_loaded += 1;
               // speed of last download in b/ms, or kb/s (data.length is approximately in bytes)
               var last_speed = data.length * 8 / delta;
               // factor so that delay is around 4s at 10kb/s, 0.4s at 100kb/s
               // multiplying by 1+rand() so that users in the same room don't wait the same time, causing bottlenecks
               var k = 30000 * (1 + Math.random());
               var delay = Math.round(k / last_speed);
               if (delay > 5000) { // no more than 5s waiting
                  delay = 5000;
               }
               self.log(Math.round(self.n_loaded * 100 / self.n_total) + '%');
               self.parts.push(data);
               setTimeout(function () {self.load_next();}, delay);
            } catch (e) {
               self.promise.reject(e);
            }
         }).fail(function (xhr, textStatus, err) {
            self.log(textStatus);
            self.promise.reject(textStatus);
         });
      }
   };
   Loader.prototype.run = function () {
      var self = this;
      self.log('v' + self.version);
      this.promise = jQuery.Deferred(function () {
         $.ajax(self.base + 'index.txt', {dataType: 'text', global: false}).done(function (data, textStatus, xhr) {
            var index = data.replace(/^\s+|\s+$/g, '').split(/\s+/);
            index = self.shuffleArray(index);
            self.add(index);
            self.log('I');
            self.load_next();
         }).fail(function (xhr, textStatus, err) {
            self.promise.reject(textStatus);
         });
      });
      return self.promise;
   };
   Loader.prototype.shuffleArray = function (values) {
      var nbValues = values.length;
      for (var iValue = 0; iValue < nbValues; iValue++) {
         var pos = iValue + (Math.round(1000 * Math.random()) % (nbValues - iValue));
         var tmp = values[iValue];
         values[iValue] = values[pos];
         values[pos] = tmp;
      }
      return values;
   };

   var drawStars = function (id, nbStars, starWidth, rate, mode, nbStarsLocked) {
      $('#' + id).addClass('stars');

      function clipPath (coords, xClip) {
         var result = [[coords[0][0], coords[0][1]]];
         var clipped = false;
         for (var iCoord = 1; iCoord <= coords.length; iCoord++) {
            var x1 = coords[iCoord - 1][0];
            var y1 = coords[iCoord - 1][1];
            var x2 = coords[iCoord % coords.length][0];
            var y2 = coords[iCoord % coords.length][1];
            if (x2 > xClip) {
               if (!clipped) {
                  result.push([xClip, y1 + (y2 - y1) * (xClip - x1) / (x2 - x1)]);
                  clipped = true;
               }
            } else {
               if (clipped) {
                  result.push([xClip, y1 + (y2 - y1) * (xClip - x1) / (x2 - x1)]);
                  clipped = false;
               }
               result.push([x2, y2]);
            }
         }
         result.pop();
         return result;
      }

      function pathFromCoords (coords) {
         var result = 'm' + coords[0][0] + ',' + coords[0][1];
         for (var iCoord = 1; iCoord < coords.length; iCoord++) {
            var x1 = coords[iCoord - 1][0];
            var y1 = coords[iCoord - 1][1];
            var x2 = coords[iCoord][0];
            var y2 = coords[iCoord][1];
            result += ' ' + (x2 - x1) + ',' + (y2 - y1);
         }
         result += 'z';
         return result;
      }

      var fillColors = {normal: 'white', locked: '#ddd', useless: '#ced'};
      var strokeColors = {normal: 'black', locked: '#ddd', useless: '#444'};
      var starCoords = [[25, 60], [5, 37], [35, 30], [50, 5], [65, 30], [95, 37], [75, 60], [78, 90], [50, 77], [22, 90]];
      var fullStarCoords = [
         [[5, 37], [35, 30], [50, 5], [65, 30], [95, 37], [75, 60], [25, 60]],
         [[22, 90], [50, 77], [78, 90], [75, 60], [25, 60]]
      ];

      $('#' + id).html('');
      var paper = new Raphael(id, starWidth * nbStars, starWidth * 0.95);
      for (var iStar = 0; iStar < nbStars; iStar++) {
         var scaleFactor = starWidth / 100;
         var deltaX = iStar * starWidth;
         var coordsStr = pathFromCoords(starCoords, iStar * 100);
         var starMode = mode;
         if (iStar >= nbStars - nbStarsLocked) {
            starMode = "locked";
         }

         paper.path(coordsStr).attr({
            fill: fillColors[starMode],
            stroke: 'none'
         }).transform('s' + scaleFactor + ',' + scaleFactor + ' 0,0 t' + (deltaX / scaleFactor) + ',0');

         var ratio = Math.min(1, Math.max(0, rate * nbStars - iStar));
         var xClip = ratio * 100;
         if (xClip > 0) {
            for (var iPiece = 0; iPiece < fullStarCoords.length; iPiece++) {
               var coords = clipPath(fullStarCoords[iPiece], xClip);
               var star = paper.path(pathFromCoords(coords)).attr({
                  fill: '#ffc90e',
                  stroke: 'none'
               }).transform('s' + scaleFactor + ',' + scaleFactor + ' 0,0 t' + (deltaX / scaleFactor) + ",0");
            }
         }
         paper.path(coordsStr).attr({
            fill: 'none',
            stroke: strokeColors[starMode],
            'stroke-width': 5 * scaleFactor
         }).transform('s' + scaleFactor + ',' + scaleFactor + ' 0,0 t' + (deltaX / scaleFactor) + ',0');
      }
   };

   function updateDivQuestionsVisibility (isShow) {
      if (isShow) {
         $("#divQuestions").show();
      } else {
         $("#divQuestions").hide();
      }
   }

   function getParameterByName (name) {
      var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
         results = regex.exec(location.search);
      return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
   }

   $(document).on('ready', function () {
      var teamParam = getParameterByName('team');
      if (teamParam !== '') {
         /* remove team from url to avoid restarting after a reload */
         var oldUrl = document.location.href;
         var newUrl = oldUrl.replace(/(team=[^&]*)/, '');
         window.history.pushState('', document.title, newUrl);
         window.checkGroupFromCode("CheckGroup", teamParam, false, false);
      } else {
         init();
      }
      window.addEventListener('resize', questionIframe.onBodyResize);
      UI.ContestHeader.checkFullscreen();
   });

}();
