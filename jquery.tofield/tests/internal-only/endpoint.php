<?php
$text = isset($_GET['text']) ? $_GET['text'] : '';
$maxSuggestions = isset($_GET['maxSuggestions']) ? $_GET['maxSuggestions'] : -1;

$fullNames = isset($_GET['fullNames']) ? true : false;

$js = file_get_contents('all.js');

$chunks = explode('gNameData.', $js);

$output = array();

foreach ($chunks as $chunk) {
	$json = json_decode(substr($chunk, strpos($chunk, '{'), strrpos($chunk, ';') - strpos($chunk, '{')));
	$array = get_object_vars($json);
//	echo '<pre>'; var_dump($array); echo '</pre>';
	if (is_array($array)) {
		foreach ($array as $name => $data) {
			$data->identifier = strtolower($data->name.'@'.substr(md5($data->name), 0, strlen($data->name) % ord($data->name[0])).'.dev');
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

if (!empty($text)) {
	$output = array_values(array_filter($output, create_function('$item', 'return (stripos($item->name, \''.$text.'\') !== false);')));
	usort($output, create_function('$a, $b', 'return stripos($a->name, \''.$text.'\') - stripos($b->name, \''.$text.'\');'));
	if ($maxSuggestions != -1) {
		$output = array_splice($output, 0, (int)$maxSuggestions);
	}
}
header("Content-type: text/javascript");
echo json_encode($output);
//sleep(rand(0, 3));




?>