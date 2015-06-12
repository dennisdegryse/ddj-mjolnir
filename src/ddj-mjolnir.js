/* global $, GM_openInTab */
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
// @icon         https://lh6.googleusercontent.com/gek_JBI9Ddd1bds-xchgPRxYfMhGAC1ii_Kq2657kNd2eG-YU6dQYZxlIMRfp5QXhXkC1vta=w1896-h835-rw
// ==/UserScript==

(function () {
    /* URL PATTERNS */
    var URL_ADMIN_GROUP              = '\/groups\/2204685680\/';
    var URL_REPORT_GROUP             = '\/groups\/288196098019436\/';
    
    /* STATES */
    var STATE_INITIAL                = 1;
    var STATE_REPORTING_COMPOSED     = 2;
    var STATE_REPORTING_SUBMITTED    = 3;
    
    /* SELECTORS */
    var S_POST                       = '.userContentWrapper';
    var S_POST_PERMALINK             = 'h5 + div a[href*=\'/permalink/\']';
    var S_POST_AUTHORLINK            = 'h5 a:first-child';
    var S_COMMENT                    = '#pagelet_group_ .userContentWrapper ul.UFIList .UFIComment'; 
    var S_COMMENT_AUTHORLINK         = 'div.UFICommentContentBlock div.UFICommentActorName';
    var S_FORM_DELETEPOST            = 'div[role=\'dialog\'] form[action*=\'delete.php\']';
    var S_REPORT_INPUT               = 'textarea[name=\'xhpc_message\']';
    var S_REPORT_POST                = 'a[data-endpoint=\'/ajax/composerx/attachment/group/post/\']';
    var S_REPORT_INPUT_REMOVEPREVIEW = 'button[title=Remove]';
    var S_REPORT_INPUT_SUBMIT        = 'form[action*="/updatestatus.php"] button[type=submit]';
    var S_REPORT_INPUT_PREVIEW       = 'form[action*="/updatestatus.php"] input[name="attachment[params][0]"]';
    
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
        summary += "Profile: https://www.facebook.com/profile.php?id=" + data.id + "\n";
        summary += "Reason: " + data.reason + "\n";
        summary += "Status: " + data.status;
    
        return summary;
    };
    
    var reportActionCondition = function (_, queryParams) {
        return queryParams.gm_action == 'publishReport';
    };
    
    ddj.hookr.addHook({
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
                var reportGroup = GM_openInTab('https://www.facebook.com/groups/288196098019436/?' + query);
            }));
        
            updateReportSummary(null);
        }
    });
    
    ddj.hookr.addHook({
        urlPattern : URL_REPORT_GROUP,
        state      : STATE_INITIAL,
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
        urlPattern : URL_REPORT_GROUP,
        state      : STATE_REPORTING_COMPOSED,
        selector   : S_REPORT_INPUT_PREVIEW,
        condition  : function (match, queryParams) {
            return reportActionCondition(match, queryParams) && $(match).val() == queryParams.gm_report_id;
        },
        handler    : function (match, queryParams) {
            var form = $(match).parents('form');
             
            form.find(S_REPORT_INPUT_REMOVEPREVIEW).trigger('click');

            setTimeout(function () {
                var submitButton = null;
                
                $(S_REPORT_INPUT_SUBMIT).each(function () {
                    submitButton = $(this);
                });
                
                submitButton.trigger('click');
            }, 2000);

            return STATE_REPORTING_SUBMITTED;
        }
    });
    
    ddj.hookr.setState(STATE_INITIAL);
})();
