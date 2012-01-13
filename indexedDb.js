var IDBTest = function(initDb, numPrograms, numSeries, numEpisodes, nowShowing) {
	var request = window.webkitIndexedDB.open("indexedDBTest", "Indexed DB Test");
	request.onsuccess = $.proxy(function(event) {
		this.db = event.target.result;
		this.start();
		if (initDb) {
			var setVersionRequest = this.db.setVersion("");
			setVersionRequest.onsuccess = $.proxy(function(event) {
				this.init(numPrograms, numSeries, numEpisodes, nowShowing);
				this.stop("init-db", "Done");
			}, this);
		} else {
			this.stop("init-db", "Skipped");
		};
	}, this);
};

IDBTest.prototype.init = function(numPrograms, numSeries, numEpisodes, nowShowing) {
	while (this.db.objectStoreNames.length > 0) {
		this.db.deleteObjectStore(this.db.objectStoreNames[0]);
	};

	var programsStore = this.db.createObjectStore("programs", { keyPath: "id", autoIncrement: true });
	programsStore.createIndex("programs_programId", "id");

	var seriesStore = this.db.createObjectStore("series", { keyPath: "id", autoIncrement: true });
	seriesStore.createIndex("series_programId", "programId");
	seriesStore.createIndex("series_nowShowing", "nowShowing");

	var episodesStore = this.db.createObjectStore("episodes", { keyPath: "id", autoIncrement: true });
	episodesStore.createIndex("episodes_seriesId", "seriesId");
	episodesStore.createIndex("episodes_status", "status");

	var	nowShowingIndex = 0,
			programId,
			seriesid,
			seriesRowId = 0,
			episodeId,
			episodeRowId = 0,
			isNowShowing,
			isNotShowing;

	for (var i = 0; i < numPrograms; i++) {
		programId = i + 1;
		programsStore.put({ name: "Program " + programId});

		for (var j = 0; j < numSeries; j++) {
			seriesId = j + 1;
			seriesRowId++;
			isNowShowing = (0 === programId % 8 && 1 === seriesId);
			isNotShowing = (0 === programId % 10 && 1 === seriesId);
			seriesStore.put({ id: seriesRowId, name: "Series " + seriesId, programId: programId, nowShowing: (isNowShowing ? nowShowing[nowShowingIndex] : null) });

			for (var k = 0; k < numEpisodes; k++) {
				episodeId = k + 1;
				episodeRowId++;
				episodesStore.put({ id: episodeRowId, name: "Episode " + episodeId, seriesId: seriesRowId, status: (isNowShowing||isNotShowing ? (episodeId < 3 ? "Watched" : (episodeId < 5 ? "Recorded" : (episodeId < 7 ? "Expected": ""))) : "") });
			};

			if (isNowShowing) {
				nowShowingIndex++;
			};
		};
	};
};

// Timer functions
IDBTest.prototype.start = function() {
	this.begin = new Date();
}

IDBTest.prototype.stop = function(stepName, result) {
	var end = new Date();
	$("#" + stepName + "-idb-result").html(result);
	$("#" + stepName + "-idb-time").text(end - this.begin);
}

// Count programs
IDBTest.prototype.countPrograms = function() {
	this.start();
	var	request = this.db.transaction(["programs"]).objectStore("programs").count();
	request.onsuccess = $.proxy(function(event) {
		this.stop("count-programs", request.result);
	}, this);
};

// Count series
IDBTest.prototype.countSeries = function() {
	this.start();
	var	request = this.db.transaction(["series"]).objectStore("series").count();
	request.onsuccess = $.proxy(function(event) {
		this.stop("count-series", request.result);
	}, this);
};

// Count episodes
IDBTest.prototype.countEpisodes = function() {
	this.start();
	var	request = this.db.transaction(["episodes"]).objectStore("episodes").count();
	request.onsuccess = $.proxy(function(event) {
		this.stop("count-episodes", request.result);
	}, this);
};

// Schedule
IDBTest.prototype.schedule = function() {
	this.start();

	var candidates = {},
			gotNowShowing = false,
			gotRecorded = false,
			gotExpected = false,
			candidatesProcessed = false,
			seriesList = [],
			seriesCount = 0,
			populatedCount = 0,
			rows = $("<table><tr><th>Program</th><th>SeriesID</th><th>Series</th><th>NowShowing</th><th>ProgramID</th><th>Episodes</th><th>Watched</th><th>Recorded</th><th>Expected</th></tr></table>");

	// Here, we setup three asyncronous requests:
	// The first request gets the list of series objects that have a non-null value for nowShowing (ie. series that are currently airing)
	// The second request gets the list of all recorded episodes.
	// The third request get this list of all upcoming (expected) episodes, regardless of whether the series is flagged as nowShowing or not.
	//
	// For each object returned in each request, we put the seriesId into an associative array (candidates).
	// The result is the unique set of seriesIds that are either currently airing or have at least one recorded or expected episode.
	//
	// At the end of each request, we set a flag to indicate that is complete, and call processCandiates()
	
	var	nowShowingRequest = this.db.transaction("series").objectStore("series").index("series_nowShowing").openCursor(webkitIDBKeyRange.lowerBound(0));
	nowShowingRequest.onsuccess = $.proxy(function(event) {
		var nowShowingCursor = nowShowingRequest.result;
		if (nowShowingCursor) {
			candidates[nowShowingCursor.value.id] = null;
			nowShowingCursor.continue();
		} else {
			gotNowShowing = true;
			processCandidates.call(this);
		};
	}, this);

	var	recordedRequest = this.db.transaction("episodes").objectStore("episodes").index("episodes_status").openCursor(webkitIDBKeyRange.only("Recorded"));
	recordedRequest.onsuccess = $.proxy(function(event) {
		var recordedCursor = recordedRequest.result;
		if (recordedCursor) {
			candidates[recordedCursor.value.seriesId] = null;
			recordedCursor.continue();
		} else {
			gotRecorded = true;
			processCandidates.call(this);
		};
	}, this);

	var	expectedRequest = this.db.transaction("episodes").objectStore("episodes").index("episodes_status").openCursor(webkitIDBKeyRange.only("Expected"));
	expectedRequest.onsuccess = $.proxy(function(event) {
		var expectedCursor = expectedRequest.result;
		if (expectedCursor) {
			candidates[expectedCursor.value.seriesId] = null;
			expectedCursor.continue();
		} else {
			gotExpected = true;
			processCandidates.call(this);
		};
	}, this);

	// This function waits for all three requests to complete, and then for each of our unique seriesId's gets the associated data to display
	function processCandidates() {
		if (gotNowShowing && gotRecorded && gotExpected) {
			for (var seriesId in candidates) {
				if (candidates.hasOwnProperty(seriesId)) {
					seriesCount++;
					getSeriesData.call(this, seriesId);
				};
			};
			candidatesProcessed = true;
			displaySchedule.call(this);
		};
	};

	function getSeriesData(seriesId) {
		var seriesRequest = this.db.transaction("series").objectStore("series").openCursor(webkitIDBKeyRange.only(Number(seriesId)));	// for some reason had to use openCursor here to get a single object. get() didn't work?
		seriesRequest.onsuccess = $.proxy(function(event) {
			var series = {
				id: seriesRequest.result.value.id,
				name: seriesRequest.result.value.name,
				nowShowing: seriesRequest.result.value.nowShowing,
				programId: seriesRequest.result.value.programId,
				episodeCount: 0,
				watchedCount: 0,
				recordedCount: 0,
				expectedCount: 0
			};

			var programRequest = this.db.transaction("programs").objectStore("programs").openCursor(webkitIDBKeyRange.only(Number(series.programId)));
			programRequest.onsuccess = $.proxy(function(series) {
				return $.proxy(function(event) {
					series.programName = programRequest.result.value.name;

					var episodeRequest = this.db.transaction("episodes").objectStore("episodes").index("episodes_seriesId").openCursor(webkitIDBKeyRange.only(Number(series.id)));
					episodeRequest.onsuccess = $.proxy(function(series) {
						return $.proxy(function(event) {
							var episodeCursor = episodeRequest.result;
							if (episodeCursor) {
								series.episodeCount++;
								switch (episodeCursor.value.status) {
									case "Watched":
										series.watchedCount++;
										break;
									case "Recorded":
										series.recordedCount++;
										break;
									case "Expected":
										series.expectedCount++;
										break;
								};
								episodeCursor.continue();
							} else {
								seriesList.push(series);
								populatedCount++;
								displaySchedule.call(this);
							};
						}, this);
					}, this)(series);
				}, this);
			}, this)(series);
		}, this);
	};

	function displaySchedule() {
		if (candidatesProcessed && seriesCount === populatedCount) {
			// Sort the array by nowShowing, then programName
			seriesList.sort(function(a,b) {
				var aValue = String(null == a.nowShowing ? 9 : a.nowShowing) + ":" + a.programName;
				var bValue = String(null == b.nowShowing ? 9 : b.nowShowing) + ":" + b.programName;
				return (aValue < bValue ? -1 : aValue > bValue ? 1 : 0);
			});

			for (var i = 0; i < seriesCount; i++) {
				var series = seriesList[i];
				rows.append($("<tr><td>" + series.programName + "</td><td>" + series.id + "</td><td>" + series.name + "</td><td>" + series.nowShowing + "</td><td>" + series.programId + "</td><td>" + series.episodeCount + "</td><td>" + series.watchedCount + "</td><td>" + series.recordedCount + "</td><td>" + series.expectedCount + "</td></tr>"));
			};
			this.stop("schedule", rows.html());
		};
	};
};
