var WebSQLTest = function(initDb, numPrograms, numSeries, numEpisodes, nowShowing) {
	this.worker = new Worker("webSqlWorkerBack.js");

	this.worker.onmessage = function(event) {
		if (1 === event.data.type) {
			if (!event.data.result) {
				event.data.result = this.rows.html();
			}
			$("#" + event.data.stepName + "-websql-result").html(event.data.result);
			$("#" + event.data.stepName + "-websql-time").text(event.data.duration);
		} else {
			var series = event.data.series;
			this.rows.append($("<tr><td>" + series.ProgramName + "</td><td>" + series.rowid + "</td><td>" + series.Name + "</td><td>" + series.NowShowing + "</td><td>" + series.ProgramID + "</td><td>" + series.EpisodeCount + "</td><td>" + series.WatchedCount + "</td><td>" + series.RecordedCount + "</td><td>" + series.ExpectedCount + "</td></tr>"));
		}
	}.bind(this);

	this.worker.postMessage({
		method: "new",
		args: Array.prototype.slice.call(arguments)
	});
};

WebSQLTest.prototype.countPrograms = function() {
	this.worker.postMessage({
		method: "countPrograms"
	});
};

WebSQLTest.prototype.countSeries = function() {
	this.worker.postMessage({
		method: "countSeries"
	});
};

WebSQLTest.prototype.countEpisodes = function() {
	this.worker.postMessage({
		method: "countEpisodes"
	});
};

WebSQLTest.prototype.schedule = function() {
	this.rows = $("<table><tr><th>Program</th><th>SeriesID</th><th>Series</th><th>NowShowing</th><th>ProgramID</th><th>Episodes</th><th>Watched</th><th>Recorded</th><th>Expected</th></tr></table>");
	this.worker.postMessage({
		method: "schedule"
	});
};
