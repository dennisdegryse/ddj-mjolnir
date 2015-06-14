/* global $, GM_openInTab, ddj */
// ==UserScript==
// @name         mjolnir
// @namespace    http://www.dennisdegryse.be/ddj/
// @version      0.1
// @description  Mjölnir - the ban hammer. Adds easy ban summary reporting to the International PHP Facebook group. The script is not related to Facebook nor PHP itself by any means. It is left aside whether or not there is any relationship with Thor, the Norwegian mythical god, and/or his awesome hammer. 
// @author       Dennis Degryse
// @match        https://www.facebook.com/*
// @require      http://code.jquery.com/jquery-2.1.4.min.js
// @require      https://raw.githubusercontent.com/dennisdegryse/ddj-hookr/master/src/ddj-hookr.js
// @grant        GM_openInTab
// @noframes
// @icon         https://github.com/dennisdegryse/ddj-mjolnir/blob/master/src/mjolnir-icon256.png?raw=true
// ==/UserScript==

(function () {
    /* URL PATTERNS */
    var URL_ADMIN_GROUP              = '\/groups\/2204685680\/';
    var URL_REPORT_GROUP             = '\/groups\/288196098019436\/';
    
    /* STATES */
    var STATE_INITIAL                = 1;
    var STATE_REPORTING_WINDOW       = 2;
    var STATE_REPORTING_COMPOSED     = 3;
    var STATE_REPORTING_SUBMITTED    = 4;
    
    /* SELECTORS */
    var S_POST                       = '.userContentWrapper';
    var S_POST_PERMALINK             = 'h5 + div a[href*=\'/permalink/\']';
    var S_POST_AUTHORLINK            = 'h5 a:first-child';
    var S_COMMENT                    = '#pagelet_group_ .userContentWrapper ul.UFIList .UFIComment'; 
    var S_COMMENT_AUTHORLINK         = 'div.UFICommentContentBlock div.UFICommentActorName';
    var S_FORM_DELETEPOST            = 'div[role=\'dialog\'] form[action*=\'delete.php\']';
    var S_REPORT_INPUT               = 'textarea[name=\'xhpc_message\']';
    var S_REPORT_POST                = 'a[data-endpoint=\'/ajax/composerx/attachment/group/post/\']';
    var S_REPORT_INPUT_REMOVEPREVIEW = '._4_4e button[title=Remove]';
    var S_REPORT_INPUT_SUBMIT        = 'form[action*="/updatestatus.php"]:last-of-type button[type=submit]';
    var S_REPORT_POSTED_LINK         = '.composerPostSection .userContentWrapper .userContent a';
    
    var violationTypes = [
        'Pornographic content',
        'Off-topic content',
        'Spam',
        'Plagiarism',
        'Non-english content'
    ];
    
    var buildReportSummary = function (data) {
        var summary = '';
    
        summary += "Facebook: " + data.name + "\n";
        summary += "Profile: " + buildUserProfileLink(data.id) + "\n";
        summary += "Reason: " + data.reason + "\n";
        summary += "Status: " + data.status;
    
        return summary;
    };
    
    var buildUserProfileLink = function(userId) {
        return "https://www.facebook.com/profile.php?id=" + userId;
    };
    
    var reportActionCondition = function (_, queryParams) {
        return queryParams.gm_action == 'publishReport';
    };
    
    ddj.hookr.addHook({
        name       : 'ExtendBanForm',
        urlPattern : URL_ADMIN_GROUP,
        state      : STATE_INITIAL,
        selector   : S_FORM_DELETEPOST,
        handler    : function (match, queryParams) {
            var form = $(match);
            var contentPanel = form.find('div.pam._13');
            var violationType = null;
            
            var getReportData = function () {
                return {
                    name:   $(document.getElementById(form.find('input[name=story_dom_id]').val())).find(S_POST_AUTHORLINK).text(),
                    id:     form.find('input[name=remove_uid]').val(),
                    reason: $('input[name=violationType]:checked').val(),
                    status: $('input[name=ban_user]').is(':checked') ? "Permanent ban" : "Removed (not permanent)"
                };
            };
            
            var updateReportSummary = function (e) {
                $('#reportSummary').val(buildReportSummary(getReportData()));
            };
            
            var createViolationOptionGroup = function (types) {
                var container = $('<div></div>');
                var option, optionInput, i;
            
                var createOption = function (id, text, setValue, checked) {
                    var input = $('<input id="inp-violationType-' + id + '" type="radio" name="violationType" value="' + (setValue ? text : '') + '"' + (checked ? ' checked ' : '') + '>').change(updateReportSummary);
                    var label = $('<label for="inp-violationType-' + id + '">' + text + '</label>');
            
                    return $('<div>').append(input).append(label);
                };
                
                for (i in types) {
                    option = createOption(i, types[i], true, false);
                    container.append(option);
                }
            
                option = createOption(types.length, 'Other:&nbsp;&nbsp;', false, true);
                optionInput = $('<input type="text" name="specificViolationType" placeholder="Specify other">').keyup(function (e) {
                    $('#inp-violationType-' + (types.length)).val($(this).val());
                    updateReportSummary(e);
                });
            
                option.append(optionInput);
                container.append(option);
                
                return container;
            };
        
            $('input[name=ban_user]').change(updateReportSummary);
        
            contentPanel.append($('<p>What is wrong with this post?</p>'));
            contentPanel.append(createViolationOptionGroup(violationTypes));
            contentPanel.append($('<p>Report summary:</p>'));
            contentPanel.append($('<textarea id="reportSummary" readonly></textarea>').css({ 
                'width' : "90%",
                'height' : "100px"
            }));
            contentPanel.append($('<div>Send Report</div>').css({
                'border' : "1px solid black",
                'padding' : "4px",
                'margin' : "10px 0px",
                'display' : "inline-block",
                'cursor' : "pointer"
            }).click(function (e) {
                var reportData = getReportData();
                var query = $.param({ 
                    gm_action :        'publishReport',
                    gm_report_id :     reportData.id,
                    gm_report_name :   reportData.name,
                    gm_report_reason : reportData.reason,
                    gm_report_status : reportData.status
                });
                
                window.open('https://www.facebook.com/groups/288196098019436/?' + query, '', 'width=480,height=320,resizable=no,scrollbars=no,menubar=no,location=no,chrome=yes,dialog=yes,centerscreen=yes');
            }));
        
            updateReportSummary(null);
        }
    });
    
    ddj.hookr.addHook({
        name       : 'DecorateReportDocument',
        urlPattern : URL_REPORT_GROUP,
        state      : STATE_INITIAL,
        selector   : 'body',
        condition  : reportActionCondition,
        handler    : function (match, queryParams) {
            var overlay = $('<div>').css({
                'position' : 'fixed',
                'left' : '0px',
                'top' : '0px',
                'right' : '0px',
                'bottom' : '0px',
                'background-color' : '#e9eaed',
                'background-image' : 'url(https://github.com/dennisdegryse/ddj-mjolnir/blob/master/src/loader.gif?raw=true)',
                'background-position' : 'center center',
                'background-repeat' : 'no-repeat',
                'z-index' : 9007199254740992
            });
            
            $(match).append(overlay);
            
            return STATE_REPORTING_WINDOW;
        }
    });
    
    ddj.hookr.addHook({
        name       : 'ComposeReport',
        urlPattern : URL_REPORT_GROUP,
        state      : STATE_REPORTING_WINDOW,
        selector   : S_REPORT_POST,
        condition  : reportActionCondition,
        handler    : function (match, queryParams) {
            var input = $(S_REPORT_INPUT);
            
            $(match).trigger('focus');
            
            input.trigger('focus').val(buildReportSummary({
                name :   queryParams.gm_report_name,
                id :     queryParams.gm_report_id,
                reason : queryParams.gm_report_reason,
                status : queryParams.gm_report_status
            }));

            return STATE_REPORTING_COMPOSED;
        }
    });
    
    ddj.hookr.addHook({
        name       : 'SubmitReport',
        urlPattern : URL_REPORT_GROUP,
        state      : STATE_REPORTING_COMPOSED,
        selector   : S_REPORT_INPUT_REMOVEPREVIEW,
        condition  : reportActionCondition,
        handler    : function (match, queryParams) {
            $(match).parent().parent().remove();
            $(S_REPORT_INPUT_SUBMIT).trigger('click');

            return STATE_REPORTING_SUBMITTED;
        }
    });
    
    ddj.hookr.addHook({
        name       : 'CloseReportWindow',
        urlPattern : URL_REPORT_GROUP,
        state      : STATE_REPORTING_SUBMITTED,
        selector   : S_REPORT_POSTED_LINK,
        condition  : function (match, queryParams) { 
            return reportActionCondition(match, queryParams) && $(match).attr('href') == buildUserProfileLink(queryParams.gm_report_id);
        },
        handler    : function (match, queryParams) {
            window.setTimeout(window.close, 2000);
        }
    });

    ddj.hookr.setState(STATE_INITIAL);
})();
