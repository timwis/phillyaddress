var api_url_base = 'http://api.phillyaddress.com/';
var map_url_base = 'http://maps.googleapis.com/maps/api/staticmap?zoom=17&size=275x275&sensor=false&center=';
var map_launch_url_base = 'http://maps.google.com/maps?hl=en&q=';//'geo:0,0?q=';

$(document).ready(function() {
	// Search by Address
	$('#search-address form').submit(function(e) {
		e.preventDefault();
		api_request('address', $.trim($('#address', this).val()));
	});

	// Search by Block
	$('#search-block form').submit(function(e) {
		e.preventDefault();
		api_request('block', $.trim($('#number', this).val()), $.trim($('#street', this).val()));
	});

	// Search by Intersection
	$('#search-intersection form').submit(function(e) {
		e.preventDefault();
		api_request('intersection', $.trim($('#street1', this).val()), $.trim($('#street2', this).val()));
	});

	// Search by Account Number
	$('#search-account form').submit(function(e) {
		e.preventDefault();
		api_request('account', $.trim($('#account', this).val()));
	});

	// Search by Owner
	$('#search-owner form').submit(function(e) {
		e.preventDefault();
		api_request('owner', $.trim($('#owner', this).val()));
	});

	// Clicked on item in properties list
	$('#results-properties li a').live('click', function(e) {
		e.preventDefault();
		api_request('account', $(this).data('account'));
	});
	
	// If URL contains a search in it
	var qs = getUrlVars();
	if(qs.q !== undefined) {
		// Construct API URL w/querystring input
		qs.type = qs.type == 'address' || qs.type == 'block' || qs.type == 'intersection' || qs.type == 'account' || qs.type == 'owner' ? qs.type : 'address';
		api_request(qs.type, $.trim(qs.q), (qs.q2 !== undefined ? $.trim(qs.q2) : null));
	}
	
});

// Communicate w/API and get JSON data back
function api_request(action, param1, param2) {
	$.mobile.showPageLoadingMsg();

	var url = api_url_base + action + '.json/' + encodeURIComponent(param1) + (param2 ? '/' + encodeURIComponent(param2) : '');
	//console.log(url);
	$.getJSON(url+'/callback=?', function(data) {
		// Single property returned
		if(data.property) {
			single_property(data.property);
			$.mobile.changePage($('#results-property'));
		}
		// Multiple properties returned
		else if(data.properties) {
			multiple_properties(data.properties);
			$.mobile.changePage($('#results-properties'));
		}
		else if(data.error) {
			error(data.error);
			$.mobile.changePage($('#error'));
		}
		else if(data.streets) {
			error('Please specify in your search one of the following streets:<br/><li>'+data.streets.join('<li>'));
			$.mobile.changePage($('#error'));
		}
		else {
			error('Unknown Error');
			$.mobile.changePage($('#error'));
		}

		$.mobile.hidePageLoadingMsg();
	})
	.error(function() {
		$.mobile.hidePageLoadingMsg();
		$.mobile.changePage($('#void'));
	});
}

function single_property(property) {
	var page = $('#results-property');
	var account_info = property.account_information;
	var account_details = property.account_details;
	var valuation_details = property.valuation_details;
	var tax_balances = property.tax_balances;

	// Set title as address
	$('#address', page).html(account_info.address);

	// Set account information
	var account_info_content = $('#account_information dl', page);
	account_info_content.empty(); // Clear any existing content from previous searches
	account_info_content.append($('<dt/>').html('Account Number'),	$('<dd/>').html(account_info.account_number));
	account_info_content.append($('<dt/>').html('Owners'),			$('<dd/>').html(account_info.owners.join('<br/>')));
	account_info_content.append($('<dt/>').html('Mailing Address'),	$('<dd/>').html(account_info.mailing_address.street.join('<br/>')+'<br/>'+account_info.mailing_address.city+'<br/>'+account_info.mailing_address.state+'<br/>'+account_info.mailing_address.zip));
	account_info_content.append($('<dt/>').html('Unit Number'),		$('<dd/>').html(account_info.unit_number));
	account_info_content.append($('<dt/>').html('Zip'),				$('<dd/>').html(account_info.zip));

	// Set account details
	var account_details_content = $('#account_details dl', page);
	account_details_content.empty(); // Clear any existing content from previous searches
	account_details_content.append($('<dt/>').html('Land Area'),						$('<dd/>').html(account_details.land_area));
	account_details_content.append($('<dt/>').html('Improvement Area'),					$('<dd/>').html(account_details.improvement_area));
	account_details_content.append($('<dt/>').html('Improvement Description'),			$('<dd/>').html(account_details.improvement_desc));
	account_details_content.append($('<dt/>').html('Begin Point'),						$('<dd/>').html(account_details.begin_point));
	account_details_content.append($('<dt/>').html('Exterior Condition'),				$('<dd/>').html(account_details.ext_condition));
	account_details_content.append($('<dt/>').html('Council District'),					$('<dd/>').html(account_details.council_district));
	account_details_content.append($('<dt/>').html('Zoning'),							$('<dd/>').html(account_details.zoning));
	account_details_content.append($('<dt/>').html('Zoning Description'),				$('<dd/>').html(account_details.zoning_desc));
	account_details_content.append($('<dt/>').html('Market Value'),						$('<dd/>').html(account_details.market_value));
	account_details_content.append($('<dt/>').html('Assessed Land (Taxable)'),			$('<dd/>').html(account_details.assessed_land_taxable));
	account_details_content.append($('<dt/>').html('Assessed Improvement (Taxable)'),	$('<dd/>').html(account_details.assessed_improvement_taxable));
	account_details_content.append($('<dt/>').html('Assessed Land (Exempt)'),			$('<dd/>').html(account_details.assessed_land_exempt));
	account_details_content.append($('<dt/>').html('Assessed Improvement (Exempt)'),	$('<dd/>').html(account_details.assessed_improvement_exempt));
	account_details_content.append($('<dt/>').html('Total Assessment'),					$('<dd/>').html(account_details.assessment));
	account_details_content.append($('<dt/>').html('Sale Date'),						$('<dd/>').html(account_details.sale_date));
	account_details_content.append($('<dt/>').html('Sale Price'),						$('<dd/>').html(account_details.sale_price));
	account_details_content.append($('<dt/>').html('Real Estate Tax'),					$('<dd/>').html(account_details.real_estate_tax));

	// Set valuation details
	var valuation_details_content = $('#valuation_details table', page);
	valuation_details_content.empty(); // Clear any existing content from previous searches
	// Header row
	valuation_details_content.append($('<tr/>').append($('<th/>').text('Year'), $('<th/>').text('Market Value'), $('<th/>').text('Assessment'), $('<th/>').text('Gross Tax')));
	// Loop through years
	$.each(valuation_details, function(key, value) {
		valuation_details_content.append($('<tr/>').append($('<td/>').text(this.year), $('<td/>').text(this.market_value), $('<td/>').text(this.total_assessment), $('<td/>').text(this.gross_tax)));
	});

	// Set tax balances
	var tax_balances_content = $('#tax_balances table', page);
	tax_balances_content.empty(); // Clear any existing content from previous searches
	// Header row
	tax_balances_content.append($('<tr/>').append($('<th/>').text('Year'), $('<th/>').text('Total')));
	// Loop through years
    if(tax_balances !== undefined && tax_balances.rows !== undefined) {
    	$.each(tax_balances.rows, function(key, value) {
    		tax_balances_content.append($('<tr/>').append($('<td/>').text(this.year), $('<td/>').text(this.total)));
    	});
        // Total
    	tax_balances_content.append($('<tr/>').append($('<td/>').text('Total'), $('<td/>').text(tax_balances.totals.total)));
    }

	// Set map image
	var geoaddress = encodeURIComponent(account_info.address+',+Philadelphia,+PA+'+account_info.zip);
	$('#map img').attr('src', map_url_base + geoaddress + '&markers=' + geoaddress);
	$('#map a').attr('href', map_launch_url_base + geoaddress);
}

function multiple_properties(properties) {
	var page = $('#results-properties');

	var list = $('ul', page);
	var initialized = list.children().size() ? true : false; // Check if listview is already initialized
	list.empty(); // Clear any existing content from previous searches
	$.each(properties, function(key, value) {
		list.append($('<li/>').append($('<a/>').attr('href', '#').data('account', this.account_number).append($('<h3/>').text(this.address), $('<p/>').text(this.owners.join(' & ')))));
	});
	if(initialized) list.listview('refresh'); // If already initialized, refresh it (don't do this before initialization or it breaks)
}

function error(error) {
	$('#error div[data-role="content"]').html(error);
}

function getUrlVars() { // http://jquery-howto.blogspot.com/2009/09/get-url-parameters-values-with-jquery.html
	var vars = [], hash;
	var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
	for(var i = 0; i < hashes.length; i++) {
		hash = hashes[i].split('=');
		vars.push(hash[0]);
		vars[hash[0]] = hash[1];
	}
	return vars;
}