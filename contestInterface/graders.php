<?php 
/* Copyright (c) 2012 Association France-ioi, MIT License http://opensource.org/licenses/MIT */

require_once("../shared/common.php");
use Aws\S3\S3Client;

initSession();

if (!isset($_SESSION["teamID"])) {
   echo json_encode(array(
      'status' => 'fail',
      'reason' => 'Equipe non loggée'
   ));
   exit;
}

$teamID = $_SESSION["teamID"];
$query = "SELECT `contest`.`ID` as `ID`, `contest`.`folder` as `folder`, `contest`.`contestMode` as `contestMode`, `contest`.`fullFeedback` as `fullFeedback` FROM `team` JOIN `group` ON (`team`.`groupID` = `group`.`ID`) JOIN `contest` ON (`group`.`contestID` = `contest`.`ID`) WHERE `team`.`ID` = ?";
$stmt = $db->prepare($query);
$stmt->execute(array($teamID));
if (!($row = $stmt->fetchObject())) {
   echo json_encode(array(
      'status' => 'fail',
      'reason' => 'impossible de trouver le concours'
   ));
   exit;
}

if ($row->fullFeedback == 0 && (!isset($_SESSION["closed"]) || $row->contestMode == 1)) {
   echo json_encode(array(
      'status' => 'fail',
      'reason' => 'Participation officielle sans score en direct, évaluation impossible'
   ));
   exit;
}

$contestID = $row->ID;
$contestFolder = $row->folder;

$ieMode = (isset($_POST['ieMode']) && $_POST['ieMode'] == 'true') ? true : false;
$gradersUrl = null;
$graders = null;
if ($config->teacherInterface->generationMode == 'local') {
   $graders = file_get_contents(__DIR__.$config->teacherInterface->sContestGenerationPath.$contestFolder.'/contest_'.$contestID.'_graders.html');
} else if (!$row->fullFeedback && !$ieMode) {
   require '../vendor/autoload.php';
   $s3Client = S3Client::factory(array(
      'credentials' => array(
           'key'    => $config->aws->key,
           'secret' => $config->aws->secret
       ),
      'region' => $config->aws->s3region,
      'version' => '2006-03-01'
   ));
   $cmd = $s3Client->getCommand('GetObject', [
      'Bucket' => $config->aws->bucketName,
      'Key'    => 'contests/'.$contestFolder.'/contest_'.$contestID.'_graders.html'
   ]);
   $request = $s3Client->createPresignedRequest($cmd, '+10 minutes');
   $gradersUrl = (string) $request->getUri();
} else if ($ieMode) {
   $s3Client = S3Client::factory(array(
      'credentials' => array(
           'key'    => $config->aws->key,
           'secret' => $config->aws->secret
       ),
      'region' => $config->aws->s3region,
      'version' => '2006-03-01'
   ));
   $graders = $s3Client->getObject(array(
       'Bucket' => $config->aws->bucketName,
       'Key'    => 'contests/'.$contestFolder.'/contest_'.$contestID.'_graders.html'
   ));
} else {
   $gradersUrl = $config->teacherInterface->sAbsoluteStaticPath.'/contests/'.$contestFolder.'/contest_'.$contestID.'_graders.html';
}

header("Content-Type: application/json");
header("Connection: close");

echo json_encode(array(
   'status' => 'success',
   'graders' => $graders,
   'gradersUrl' => $gradersUrl,
   'bonusScore' => $_SESSION["bonusScore"]
));
