<?php

	session_start();
	
	ini_set('display_errors', 1);
	ini_set('display_startup_errors', 1);
	error_reporting(E_ALL);

	require("../config.php");
	require("../temp_questions_db_inline.php");
	require("./aq.functions.php");
	require("./sql.php");
	require('./phpmailer/class.phpmailer.php');
	require('./phpmailer/class.smtp.php');

	$answers = isset($_REQUEST["answers"]) ? trim(get_magic_quotes_gpc() ? stripslashes($_REQUEST["answers"]) : $_REQUEST["answers"]) : array();
	$test_id = isset($_REQUEST["testid"]) ? intval($_REQUEST["testid"]) : 0;
	$link_page = isset($_REQUEST["link"]) ? (get_magic_quotes_gpc() ? stripslashes($_REQUEST["link"]) : $_REQUEST["link"]) : "";

	$fields = array(
		"personalinfo" => isset($_REQUEST["personalinfo"]) ? (get_magic_quotes_gpc() ? stripslashes($_REQUEST["personalinfo"]) : $_REQUEST["personalinfo"]) : "",
		"answers" => isset($_REQUEST["answers"]) ? (get_magic_quotes_gpc() ? stripslashes($_REQUEST["answers"]) : $_REQUEST["answers"]) : "",
		"testid" => isset($_REQUEST["testid"]) ? intval($_REQUEST["testid"]) : 0,
		"section_id" => isset($_REQUEST["section_id"]) ? $_REQUEST["section_id"] : 0,
		"timeline" => time()
	);

	//Just one section
	$ids_by_section = array();
	$min_points_by_section = array();

	foreach($content_tests_array AS $test){

		foreach($test["sections"] AS $section){
			$min_points_by_section[$section["id"]] = $section["min_points"];
			foreach($section["groups"] AS $group){
				foreach($group["questions"] AS $question){
					foreach($question["items"] AS $item){
						if(!isset($ids_by_section[$section["id"]])) $ids_by_section[$section["id"]] = array();
						$ids_by_section[$section["id"]][] = $item["id"];
					}
				}
			}
		}

	}

	$aq = new AQ($answers,$content_tests_array[$test_id],$fields["section_id"] !== "D" ? $fields["section_id"] : NULL);

	$lines = $aq->get_result();
	$points = 0;

	foreach($lines AS $item_id => $result){
		if($result["review_required"] && $result["correct"] && $result["correct"] !== -1){
			$points += $result["correct"];	
		}
	}

	if($fields["section_id"] !== "D" && $points >= $min_points_by_section[$fields["section_id"]]){
		echo json_encode(array("status" => true, "points" => $points, "next" => true));
		exit;
	}
	
	$section_html = $fields["section_id"];
	$points_html = $points . "";

	$date_format = date(DATE_RFC2822, $fields["timeline"]);

	$personalinfo_array = json_decode($fields["personalinfo"],true);

	$fields["fullname"] = array();
	!empty($personalinfo_array["firstName"]) && ($fields["fullname"][] = $personalinfo_array["firstName"]);
	!empty($personalinfo_array["middleName"]) && ($fields["fullname"][] = $personalinfo_array["middleName"]);
	!empty($personalinfo_array["lastName"]) && ($fields["fullname"][] = $personalinfo_array["lastName"]);
	$fields["fullname"] = implode(" ", $fields["fullname"]);


	$stmt = $mysqli->prepare('INSERT INTO tests_registered (fullname,personalinfo,answers,testid,points,timeline) VALUES (?,?,?,?,?,?)');

	$stmt->bind_param('sssiii', $fields["fullname"], $fields["personalinfo"], $fields["answers"], $fields["testid"], $points, $fields["timeline"]);
	$inserted = $stmt->execute();

	if($inserted){

		$all_fields = array("firstName", "middleName", "lastName", "email", "address", "countryOfBirth","city","state","phone1","phone2","phone3","zipcode","datebirth1","datebirth2","datebirth3");

		foreach($all_fields AS $keyname){
			if(!isset($personalinfo_array[$keyname])) $personalinfo_array[$keyname] = "";
		}

		$personalinfo_html = '<div>Full name: <b>'.$personalinfo_array["firstName"].' '.$personalinfo_array["middleName"].' '.$personalinfo_array["lastName"].'</b></div>';
		$personalinfo_html = '<div>Email: <b>'.$personalinfo_array["email"].'</b></div>';
		$personalinfo_html .= '<div>Country of Birth: <b>'.$personalinfo_array["countryOfBirth"].'</b></div>';
		$personalinfo_html .= '<div>Address: <b>'.$personalinfo_array["address"].'</b></div>';
		$personalinfo_html .= '<div>City: <b>'.$personalinfo_array["city"].'</b></div>';
		$personalinfo_html .= '<div>State: <b>'.$personalinfo_array["state"].'</b></div>';
		$personalinfo_html .= '<div>Zipcode: <b>'.$personalinfo_array["zipcode"].'</b></div>';
		$personalinfo_html .= '<div>Phone: <b>'.$personalinfo_array["phone1"].' - '.$personalinfo_array["phone2"].' - '.$personalinfo_array["phone3"].'</b></div>';
		$personalinfo_html .= '<div>Date of birth: <b>'.$personalinfo_array["datebirth1"].' / '.$personalinfo_array["datebirth2"].' / '.$personalinfo_array["datebirth3"].'</b></div>';

		$link_test = $link_page . "?student_test_id=" . $mysqli->insert_id;

			
		$mail             = new PHPMailer();

		if($config["email"]["smtp"]){
			$mail->IsSMTP();

			//$mail->SMTPDebug  = 1;
			$mail->SMTPAuth   = true;
			$mail->SMTPSecure = $config["email"]["smtp_secure"];
			$mail->Host       = $config["email"]["smtp_host"];
			$mail->Port       = $config["email"]["smtp_port"];;
			$mail->Username   = $config["email"]["smtp_username"];
			$mail->Password   = $config["email"]["smtp_password"];
		}

		$mail->SetFrom($config["email"]["from"][0], $config["email"]["from"][1]);

		$mail->Subject    = sprintf($config["email"]["subject_test"], $fields["fullname"], $fields["testid"] . "");

		$mail->AltBody    = sprintf($config["email"]["received_student_test_plaintext"], $fields["fullname"], $date_format, $personalinfo_html, $link_test);

		$mail->MsgHTML(sprintf($config["email"]["received_student_test_html"], $fields["fullname"], $section_html, $points_html, $date_format, $personalinfo_html, $link_test));

		$mail->AddAddress($config["email"]["teacher_email"][0], $config["email"]["teacher_email"][1]);

		echo json_encode(array("status" => true, "msg" => $mail->Send() ? "" : '<p class="alert alert-warning">Error al enviar correo, contacte con el administrador.<br/><small>'.$mail->ErrorInfo.'</small></p>'));

	}else{
		echo json_encode(array("status" => false, "msg" => "Ha habido un error al ingresar el examen."));	
	}

	

	/*
	if(!$test_id || !isset($content_tests_array[$test_id])) die(json_encode(array("error" => "Invalid test id")));

	$aq = new AQ($answers,$content_tests_array[$test_id]);

	echo json_encode(array("status" => true, "lines" => $aq->get_result()));*/

?>