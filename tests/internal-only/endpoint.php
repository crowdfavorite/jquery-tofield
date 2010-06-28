<?php
$text = isset($_GET['text']) ? $_GET['text'] : '';
$maxSuggestions = isset($_GET['maxSuggestions']) ? $_GET['maxSuggestions'] : -1;

$fullNames = isset($_GET['fullNames']) ? true : false;
$forRelease = isset($_GET['forRelease']) ? true : false;

$js = file_get_contents('all.js');

$chunks = explode('gNameData.', $js);

$output = array();

$domains = array(
	'gmail.example.com',
	'aol.example.com',
	'yahoo.example.com',
	'hotmail.example.com'
);

function mapOrigin($origin) {
	switch ($origin){
		case 'Gaelic': case 'Irish': return 'Ireland';
		case 'French': return 'France';
		case 'Japan': case 'Japanese': return 'Japan';
		case 'American': return 'USA';
		case 'Greek': return 'Greece';
		case 'Italian': return 'Italy';
		case 'Russian': return 'Russia';
		case 'Chinese': return 'China';
		case 'Estonian': return 'Estonia';
		case 'Scottish': return 'Scotland';
		case 'German': case 'Germanic': return 'Germany';
		case 'Basque': case 'Spanish': return 'Spain';
		case 'Sanskrit': return 'India';
		case 'English': return 'U.K.';
	}
	return 'USA';
}

foreach ($chunks as $chunk) {
	$json = json_decode(substr($chunk, strpos($chunk, '{'), strrpos($chunk, ';') - strpos($chunk, '{')));
	$array = get_object_vars($json);
//	echo '<pre>'; var_dump($array); echo '</pre>';
	if (is_array($array)) {
		foreach ($array as $name => $data) {
			//$data->identifier = strtolower($data->name.'@'.substr(md5($data->name), 0, strlen($data->name) % ord($data->name[0])).'.dev');
			$data->domain = $domains[strlen($data->name) % count($domains)];
			$data->identifier = strtolower($data->name.'@'.$data->domain);
			$data->customClass = $data->origin;
			unset($data->rank_in_2000s);
			$output[] = $data;
		}
	}
}

if ($fullNames) {
	$surnames = array_values(array_filter($output, create_function('$item', 'return $item->gender == \'surname\';')));
	$firstNames = array_values(array_filter($output, create_function('$item', 'return $item->gender !== \'surname\';')));
	$output = array();
	
	$n = 0;
	foreach ($firstNames as $item) {
		$index = (((strlen($item->name) + ord($item->name[0]) + $n) / 5) * .1);
		$index = $index > 1 ? $index - floor($index) : $index;
//		echo $index.'... ';
		$index = floor(count($surnames) * $index);
//		echo $index.' out of '.count($surnames).'<br/>';
		$last = $surnames[$index];
//		echo $last->name.'<br/>';
		$item->lastName = $last->name;
		$item->firstName = $item->name;
		$item->name = $item->firstName.' '.$item->lastName;
		$output[] = $item;
		$n++;
	}
}

if (!empty($text) || $forRelease) {
	if (!empty($text)) {
		$output = array_values(array_filter($output, create_function('$item', 'return (stripos($item->name, \''.$text.'\') !== false);')));
		usort($output, create_function('$a, $b', 'return stripos($a->name, \''.$text.'\') - stripos($b->name, \''.$text.'\');'));
	}
	if ($maxSuggestions != -1) {
		if ($forRelease) {
			foreach ($output as $obj)  {
				$obj->customClass = mapOrigin($obj->origin);
				$obj->location = $obj->customClass;
				unset($obj->origin);
				unset($obj->gender);
				unset($obj->meaning);
				unset($obj->link);
			}
			while (count($output) > (int)$maxSuggestions) {	// heh. not exactly speedy.
				$n = array_rand($output);
				array_splice($output, $n, 1);
			}
		}
		else {
			$output = array_splice($output, 0, (int)$maxSuggestions);
		}
	}
}
header("Content-type: text/javascript");
echo json_encode($output);
//sleep(rand(0, 3));




?>