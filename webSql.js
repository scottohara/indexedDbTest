var WebSQLTest = function(initDb, numPrograms, numSeries, numEpisodes, nowShowing) {
	this.db = window.openDatabase("webSQLTest", "", "WebSQL Test", 5000);
	this.start();
	if (initDb) {
		this.init(numPrograms, numSeries, numEpisodes, nowShowing);
		this.stop("init-db", "Done");
	} else {
		this.stop("init-db", "Skipped");
	};
};

WebSQLTest.prototype.init = function(numPrograms, numSeries, numEpisodes, nowShowing) {
	this.db.transaction(function(trx) {
		trx.executeSql("DROP TABLE IF EXISTS Program");
		trx.executeSql("DROP TABLE IF EXISTS Series");
		trx.executeSql("DROP TABLE IF EXISTS Episode");
		trx.executeSql("CREATE TABLE IF NOT EXISTS Program (Name)");
		trx.executeSql("CREATE TABLE IF NOT EXISTS Series (Name, ProgramID, NowShowing)");
		trx.executeSql("CREATE TABLE IF NOT EXISTS Episode (Name, SeriesID, Status, StatusDate)");
		
		var	nowShowingIndex = 0,
				programId,
				seriesId,
				episodeId,
				isNowShowing,
				isNotShowing;

		for (var i = 0; i < numPrograms; i++) {
			programId = i + 1;
			trx.executeSql("INSERT INTO Program (Name) VALUES (?)", ["Program " + programId], function (trx, resultSet) {
				programId = resultSet.insertId;

				for (var j = 0; j < numSeries; j++) {
					seriesId = j + 1;
					isNowShowing = (0 === programId % 8 && 1 === seriesId);
					isNotShowing = (0 === programId % 10 && 1 === seriesId);
					trx.executeSql("INSERT INTO Series (Name, ProgramID, NowShowing) VALUES (?, ?, ?)", ["Series " + seriesId, programId, (isNowShowing ? nowShowing[nowShowingIndex] : null)], function(isNowNot) {
						return function(trx, resultSet) {
							seriesId = resultSet.insertId;


							for (var k = 0; k < numEpisodes; k++) {
								episodeId = k + 1;
								trx.executeSql("INSERT INTO Episode (Name, SeriesID, Status, StatusDate) VALUES (?, ?, ?, ?)", ["Episode " + episodeId, seriesId, (isNowNot ? (episodeId < 3 ? "Watched" : (episodeId < 5 ? "Recorded" : (episodeId < 7 ? "Expected": ""))) : ""), ""]);
							};
						};
					}(isNowShowing||isNotShowing));
					if (isNowShowing) {
						nowShowingIndex++;
					};
				};
			});
		};
	});
};

// Timer functions
WebSQLTest.prototype.start = function() {
	this.begin = new Date();
}

WebSQLTest.prototype.stop = function(stepName, result) {
	var end = new Date();
	$("#" + stepName + "-websql-result").html(result);
	$("#" + stepName + "-websql-time").text(end - this.begin);
}

// Count programs
WebSQLTest.prototype.countPrograms = function() {
	this.start();
	this.db.readTransaction($.proxy(function(trx) {
		trx.executeSql("SELECT COUNT(*) AS ProgramCount FROM Program", [], $.proxy(function(trx, resultSet) {
			this.stop("count-programs", resultSet.rows.item(0).ProgramCount);
		}, this));
	}, this));
};

// Count series
WebSQLTest.prototype.countSeries = function() {
	this.start();
	this.db.readTransaction($.proxy(function(trx) {
		trx.executeSql("SELECT COUNT(*) AS SeriesCount FROM Series", [], $.proxy(function(trx, resultSet) {
			this.stop("count-series", resultSet.rows.item(0).SeriesCount);
		}, this));
	}, this));
};

// Count episodes
WebSQLTest.prototype.countEpisodes = function() {
	this.start();
	this.db.readTransaction($.proxy(function(trx) {
		trx.executeSql("SELECT COUNT(*) AS EpisodeCount FROM Episode", [], $.proxy(function(trx, resultSet) {
			this.stop("count-episodes", resultSet.rows.item(0).EpisodeCount);
		}, this));
	}, this));
};

// Schedule
WebSQLTest.prototype.schedule = function() {
	this.start();
	this.db.readTransaction($.proxy(function(trx) {
		trx.executeSql("SELECT p.Name AS ProgramName, s.rowid, s.Name, s.NowShowing, s.ProgramID, COUNT(e.rowid) AS EpisodeCount, COUNT(e2.rowid) AS WatchedCount, COUNT(e3.rowid) AS RecordedCount, COUNT(e4.rowid) AS ExpectedCount FROM Program p JOIN Series s on p.rowid = s.ProgramID LEFT OUTER JOIN Episode e on s.rowid = e.SeriesID LEFT OUTER JOIN Episode e2 ON e.rowid = e2.rowid AND e2.Status = 'Watched' LEFT OUTER JOIN Episode e3 ON e.rowid = e3.rowid AND e3.Status = 'Recorded' LEFT OUTER JOIN Episode e4 ON e.rowid = e4.rowid AND e4.Status = 'Expected' GROUP BY s.rowid HAVING s.NowShowing IS NOT NULL OR COUNT(e3.rowid) > 0 OR COUNT(e4.rowid) > 0 ORDER BY CASE WHEN s.NowShowing IS NULL THEN 1 ELSE 0 END, s.NowShowing, p.Name", [], $.proxy(function(trx, resultSet) {
			var rows = $("<table><tr><th>Program</th><th>SeriesID</th><th>Series</th><th>NowShowing</th><th>ProgramID</th><th>Episodes</th><th>Watched</th><th>Recorded</th><th>Expected</th></tr></table>");
			for (var i = 0; i < resultSet.rows.length; i++) {
				var series = resultSet.rows.item(i);
				rows.append($("<tr><td>" + series.ProgramName + "</td><td>" + series.rowid + "</td><td>" + series.Name + "</td><td>" + series.NowShowing + "</td><td>" + series.ProgramID + "</td><td>" + series.EpisodeCount + "</td><td>" + series.WatchedCount + "</td><td>" + series.RecordedCount + "</td><td>" + series.ExpectedCount + "</td></tr>"));
			}
			this.stop("schedule", rows.html());
		}, this));
	}, this));
};
