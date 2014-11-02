<?php
/*
 * OPA API
 * Created by Tim Wisniewski (www.timwis.com)
 * 
 * This provides an API for opa.phila.gov by fetching their data on request, scraping it and providing it in a software-friendly format such as JSON, XML, PHP or Text.
 * In addition, it scrapes the tax balances for the property from the Department of Revenue web site.
 * Note that this is a live API and pulls directly from the OPA/Revenue web sites. Therefore it may not be the same data as phillyaddress.com, as phillyaddress.com is static.
 *
 * See README file for usage.
 *
 */
require_once('config.php');
require_once('phpQuery-onefile.php');
require_once('functions.php');

// If searching
$url = isset($_GET['url']) ? $_GET['url'] : '';
if($url) {
	// Parse URL
	$url_parts = split_url($url);
	if(empty($url_parts)) die('Invalid URL');
	$action = $url_parts[0];
	$querystring = array_slice($url_parts, 1);

	// Determine Output Format
	$output_format = 'json';
	if(($pos = strpos($action, '.')) !== FALSE) {
		$output_format = substr($action, $pos+1);
		$action = substr($action, 0, $pos);
	}

	// If callback function is set
	$callback = '';
	for($i = 0; $i < sizeof($querystring); $i++) {
		if(strtolower(substr($querystring[$i], 0, 9)) == 'callback=') {
			$callback = substr($querystring[$i], 9);
			unset($querystring[$i]);
			$querystring = array_values($querystring);
		}
	}

	// Array variable that will be output in the specified format
	$result = array();

	// Fetch HTML from OPA
	if($html = search(FORM_URL_BASE.FORM_URL_FILE, $action, $querystring)) {
		$result = array();
		$doc = phpQuery::newDocument($html);

		// If errors exist, include them in output
		if($error = read_field(FIELD_ERROR)) {
			$result['error'] = $error;
		}

		// If particular property is returned (as opposed to a list of properties)
		if($account_number = read_field(FIELD_ACCOUNT_NUMBER)) {
			// The main business!
			$result['property'] = array(
				// Account Information
				'account_information' => array(
					'account_number' => $account_number,
					'address' => read_field(FIELD_ADDRESS),
					'owners' => split_lines(read_field(FIELD_OWNERS, true)),
					'mailing_address' => array(
						'street' => split_lines(read_field(FIELD_MAILING_ADDRESS_STREET, true)),
						'city' => read_field(FIELD_MAILING_ADDRESS_CITY),
						'state' => read_field(FIELD_MAILING_ADDRESS_STATE),
						'zip' => read_field(FIELD_MAILING_ADDRESS_ZIP),
					),
					'unit_number' => read_field(FIELD_UNIT_NUMBER),
					'zip' => read_field(FIELD_ZIP),
				),

				// Account Details
				'account_details' => array(
					// Property Characteristics
					'land_area' => read_field(FIELD_LAND_AREA),
					'improvement_area' => read_field(FIELD_IMPROVEMENT_AREA),
					'improvement_desc' => read_field(FIELD_IMPROVEMENT_DESC),
					'begin_point' => read_field(FIELD_BEGIN_POINT),
					'ext_condition' => html_entity_decode(read_field(FIELD_EXT_CONDITION)),
					'council_district' => read_field(FIELD_COUNCIL_DISTRICT),
					'zoning' => read_field(FIELD_ZONING),
					'zoning_desc' => read_field(FIELD_ZONING_DESC),
					
					// Certified Values, Sales & Tax Info
					'market_value' => read_field(FIELD_MARKET_VALUE),
					'assessed_land_taxable' => read_field(FIELD_ASSD_LAND_TAXABLE),
					'assessed_improvement_taxable' => read_field(FIELD_ASSD_IMP_TAXABLE),
					'assessed_land_exempt' => read_field(FIELD_ASSD_LAND_EXEMPT),
					'assessed_improvement_exempt' => read_field(FIELD_ASSD_IMP_EXEMPT),
					'assessment' => read_field(FIELD_ASSESSMENT),
					'sale_date' => read_field(FIELD_SALE_DATE),
					'sale_price' => read_field(FIELD_SALE_PRICE),
					'real_estate_tax' => read_field(FIELD_REAL_ESTATE_TAX),
				),
			);
			// Valuation Details
			$rows = pq(FIELD_VALUATION_ROWS);
			foreach($rows as $row) {
				$pqrow = pq($row);
				if($pqrow->hasClass(CLASS_ROW1) || $pqrow->hasClass(CLASS_ROW2)) {
					$cols = $pqrow->children('td');
					$year = trim($cols->eq(0)->text());
					$result['property']['valuation_details'][$year] = array(
						'year' => $year,
						'market_value' => trim($cols->eq(1)->text()),
						'assessed_land_taxable' => trim($cols->eq(2)->text()),
						'assessed_improvement_taxable' => trim($cols->eq(3)->text()),
						'assessed_land_exempt' => trim($cols->eq(4)->text()),
						'assessed_improvement_exempt' => trim($cols->eq(5)->text()),
						'total_assessment' => trim($cols->eq(6)->text()),
						'gross_tax' => trim($cols->eq(7)->text()),
					);
				}
			}
			// Tax Balances
			if($html_tax = fetch_curl(TAX_URL_BASE.$account_number, null, null, false)) {
				$doc_tax = phpQuery::newDocument($html_tax);

				// If success
				$table = pq('table.grdRecords', $doc_tax);
				if($table->length()) {
					$totals_row = $table->find('tr:last')->find('td');
					$result['property']['tax_balances']['totals'] = array(
						'principal' => trim($totals_row->eq(1)->text()),
						'interest' => trim($totals_row->eq(1)->text()),
						'penalty' => trim($totals_row->eq(2)->text()),
						'other' => trim($totals_row->eq(4)->text()),
						'total' => trim($totals_row->eq(5)->text()),
					);

					$rows = $table->find('tr');
					for($i = 1; $i < $rows->length - 1; $i++) {
						$cols = $rows->eq($i)->find('td');
						$year = trim($cols->eq(0)->text());
						$result['property']['tax_balances']['rows'][$year] = array(
							'year' => $year,
							'principal' => trim($cols->eq(1)->text()),
							'interest' => trim($cols->eq(1)->text()),
							'penalty' => trim($cols->eq(2)->text()),
							'other' => trim($cols->eq(4)->text()),
							'total' => trim($cols->eq(5)->text()),
							'lien' => trim($cols->eq(6)->text()),
							'solicitor' => trim($cols->eq(7)->text()),
							'status' => trim($cols->eq(8)->text()),
						);
					}
				}
			}
		}
		// Or if a list of properties were returned (because of block/intersection search, or not-specific-enough address search)
		elseif(read_field(FIELD_LIST_PROPERTIES)) { // TODO: Add sorting
			// Parse list
			$result = parse_list_properties($doc);

			// Pagination: Fetch other pages & parse their lists too (this takes a while because the OPA only provides 10 results per request)
			$pages = pq(FIELD_PAGES);
			if(!empty($pages)) {
				$querystring2 = array(pq(FIELD_VIEWSTATE)->val(), '');
				foreach($pages as $page) {
					// This is a tricky method because the OPA site (ASP.NET) uses VIEWSTATE and strange POST data...just go with it.
					$href = pq($page)->attr('href'); // specifies which page..somehow
					$querystring2[1] = parse_eventtarget($href);

					$action = pq(FIELD_FORM, $doc)->attr('action'); // Get form URL
					$html2 = search(FORM_URL_BASE.$action, 'paginate', $querystring2);
					$doc2 = phpQuery::newDocument($html2);
					$result2 = parse_list_properties($doc2);
					$result = array_merge_recursive($result, $result2);
				}
			}
		}
		// Or if a list of streets were returned (try searching "30 broad st" and it will return "N BROAD ST" and "S BROAD ST")
		elseif(read_field(FIELD_LIST_STREETS)) {
			$rows = pq(FIELD_LIST_STREETS);
			foreach($rows as $row) {
				$pqrow = pq($row);
				if($pqrow->hasClass(CLASS_ROW1) || $pqrow->hasClass(CLASS_ROW2)) {
					$result['streets'] []= trim($pqrow->text());
				}
			}
		}
	}

	// Output Results
	if($output_format == 'xml') {
		header('Content-type: text/xml; charset=UTF-8');
		$xml = new SimpleXMLElement("<?xml version=\"1.0\"?><result></result>");
		array_to_xml($result, $xml);
		echo $xml->asXML();
	}
	elseif($output_format == 'php') {
		echo serialize($result);
	}
	elseif($output_format == 'txt') {
		header('Content-type: text/html; charset=UTF-8');
		echo '<pre>'.print_r($result, true).'</pre>';
	}
	else {
		header('Content-type: application/json; charset=UTF-8');
		if($callback)
			echo $callback . '(' . json_encode($result) . ');';
		else
			echo json_encode($result);
	}
}
else {
	// Otherwise display homepage
	printfile('index.html');
}