<?php

function search($url, $action, $querystring) {
	$query_data = array();
	$post_data = array(
		'__EVENTTARGET' => POST_EVENTTARGET,
		'__EVENTARGUMENT' => POST_EVENTARGUMENT,
		'__VIEWSTATE' => POST_VIEWSTATE,
	);

	if($action == 'address') {
		if(sizeof($querystring) < 1) return;
		$query_data = array(
			POST_ADDRESS => $querystring[0],
			POST_ADDRESS_BUTTON => POST_BUTTON_VALUE,
		);
	}
	elseif($action == 'block') {
		if(sizeof($querystring) < 2) return;
		$query_data = array(
			POST_BLOCK_NUMBER => $querystring[0],
			POST_BLOCK_STREET => $querystring[1],
			POST_BLOCK_BUTTON => POST_BUTTON_VALUE,
		);
	}
	elseif($action == 'intersection') {
		if(sizeof($querystring) < 2) return;
		$query_data = array(
			POST_INTERSECTION_1 => $querystring[0],
			POST_INTERSECTION_2 => $querystring[1],
			POST_INTERSECTION_BUTTON => POST_BUTTON_VALUE,
		);
	}
	elseif($action == 'account') {
		if(sizeof($querystring) < 1) return;
		$query_data = array(
			POST_ACCOUNT => $querystring[0],
			POST_ACCOUNT_BUTTON => POST_BUTTON_VALUE,
		);
	}
	elseif($action == 'owner') {
		if(sizeof($querystring) < 1) return;
		$query_data = array(
			POST_OWNER => $querystring[0],
			POST_OWNER_BUTTON => POST_BUTTON_VALUE,
		);
	}
	elseif($action == 'paginate') {
		if(sizeof($querystring) < 2) return;
		$query_data = array(
			'__VIEWSTATE' => $querystring[0],
			'__EVENTTARGET' => $querystring[1],
		);
	}
	$post_data = array_merge($post_data, $query_data);
	return fetch_curl($url, $post_data, COOKIES);
}

function split_url($url) {
	$parts = explode('/', $url);
	return array_map('trim', $parts);
}

function fetch_curl($url, $data = array(), $cookies = NULL, $post = true, $dotnet = true) {
	$ch = curl_init($url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	if($cookies) curl_setopt($ch, CURLOPT_COOKIE, $cookies);
	if($post) curl_setopt($ch, CURLOPT_POST, true);
	if(!empty($data)) curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
	if($dotnet) {
		curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
		curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
	}
	$result = curl_exec($ch);
	curl_close($ch);
	return $result;
}

function parse_list_properties($doc) {
	global $censored_accounts;
	$result = array('properties' => array());
	$rows = pq(FIELD_LIST_PROPERTIES, $doc);
	foreach($rows as $row) {
		$pqrow = pq($row);
		if($pqrow->hasClass(CLASS_ROW1) || $pqrow->hasClass(CLASS_ROW2)) {
			$cols = $pqrow->children('td');

			// Censorship
			$account_number = trim($cols->eq(0)->text());
			if(!in_array($account_number, $censored_accounts)) {

				$result['properties'] []= array(
					'account_number' => trim($cols->eq(0)->text()),
					'address' => trim($cols->eq(1)->children('span')->text()),
					'property_desc' => trim($cols->eq(2)->text()),
					'owners' => split_lines($cols->eq(3)->html()),
					'sale_price' => trim($cols->eq(4)->text()),
					'sale_date' => trim($cols->eq(5)->text()),
					'proposed_value' => trim($cols->eq(6)->text()),
					'proposed_tax' => trim($cols->eq(7)->text()),
				);
			}
		}
	}
	return $result;
}

function read_field($selector, $html = false) {
	$field = pq($selector);
	$value = $html ? $field->html() : $field->text();
	if($field) return trim($value);
	return '';
}

function split_lines($string, $delimiter = '<br>') {
	$array = explode($delimiter, $string);
	return array_map('trim', $array);
}

// Parse out eventtarget from javascript:__doPostBack('SearchAddress1$AddressSearch1$DataGrid1$_ctl14$_ctl2','')
function parse_eventtarget($string) {
	return str_replace('$', ':', substr($string, 25, -5));
}
function printfile($filename) {
	$fp = fopen($filename, 'r');
	while(!feof($fp))
		echo fgets($fp, 4096);
}

// From http://darklaunch.com/2009/05/23/php-xml-encode-using-domdocument-convert-array-to-xml-json-encode
// Modified by Tim Wisniewski to deal with int key node names
function array_to_xml($data, &$xml) {
    foreach($data as $key => $value) {
        if(is_array($value)) {
            if(!is_numeric($key)){
                $subnode = $xml->addChild("$key");
                array_to_xml($value, $subnode);
            }
            else{
				if(is_int($key)) {
					if(substr($xml->getName(), -1) == 's')
						$subnode = $xml->addChild(substr($xml->getName(), 0, -1));
					else
						$subnode = $xml->addChild($xml->getName()."-row");
					array_to_xml($value, $subnode);
				}
				else
	                array_to_xml($value, $xml);
            }
        }
        else {
			if(is_int($key)) {
				if(substr($xml->getName(), -1) == 's')
					$xml->addChild(substr($xml->getName(), 0, -1), "$value");
				else
					$xml->addChild($xml->getName()."-row", "$value");
			}
			else
	            $xml->addChild("$key","$value");
        }
    }
}