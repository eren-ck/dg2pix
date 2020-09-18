# -*- coding: utf-8 -*-
"""
API - for querying the data 
"""

# Author: Eren Cakmak <eren.cakmak@uni-konstanz.de>
#
# License: MIT

import logging

from flask import Blueprint, jsonify, request
import networkx as nx
from networkx.readwrite import json_graph
import json
import numpy as np
import hdbscan
from sklearn.metrics.pairwise import pairwise_distances
from scipy.spatial.distance import cdist

import model

backend_api = Blueprint('api', __name__)

logger = logging.getLogger(__name__)


@backend_api.route("/load_dataset/<int:id>", methods=['POST'])
def load_dataset(id=None):
    """Load and return the embeddings of the new dataset
    """
    if not id:
        return jsonify({})
    model.load_data(id)
    return jsonify({})


@backend_api.route("/load_embedding/<name>", methods=['POST'])
def load_embedding(name=None):
    """Load the embeddings of a dataset
    """
    if not name:
        return jsonify({})
    model.hierarchy.load_embedding(name)
    return jsonify({})


@backend_api.route("/get_embeddings")
def get_embeddings():
    """Returns the embeddings with reordering stratetgies
    """
    xAxis = request.args.get('x')
    yAxis = request.args.get('y')
    rank_idx = int(request.args.get('rank_embedding'))
    embeddings = model.hierarchy.get_embeddings()
    ordering = list(range(len(embeddings)))
    # required for the grey bounding boxes of the found clusters
    cluster_idx = []

    if yAxis == 'mean':
        a = np.array(embeddings)
        embeddings = a[:, np.mean(a, axis=0).argsort()].tolist()
    elif yAxis == 'median':
        a = np.array(embeddings)
        embeddings = a[:, np.median(a, axis=0).argsort()].tolist()
    elif yAxis == 'min':
        a = np.array(embeddings)
        embeddings = a[:, np.min(a, axis=0).argsort()].tolist()
    elif yAxis == 'max':
        a = np.array(embeddings)
        embeddings = a[:, np.max(a, axis=0).argsort()].tolist()
    elif yAxis == 'std':
        a = np.array(embeddings)
        embeddings = a[:, np.std(a, axis=0).argsort()].tolist()
    elif yAxis == 'var':
        a = np.array(embeddings)
        embeddings = a[:, np.var(a, axis=0).argsort()].tolist()

    if xAxis == 'clustering':
        distance_matrix = pairwise_distances(np.array(embeddings),
                                             metric='cosine')
        clusterer = hdbscan.HDBSCAN(metric='precomputed', min_cluster_size=2)
        clusterer.fit(distance_matrix)
        # mapping positions and cluster
        mapping = {
            i: np.where(clusterer.labels_ == i)[0]
            for i in np.unique(clusterer.labels_)
        }

        # Cluster indices reuqired for grey bounding boxes
        tmp_idx = 0

        # iterate the mapping and store the results
        tmp_embeddings = []
        tmp_ordering = []
        for key, value in mapping.items():
            for idx in value.tolist():
                tmp_embeddings.append(embeddings[idx])
                tmp_ordering.append(idx)

            cluster_idx.append([tmp_idx, len(tmp_embeddings)])
            tmp_idx = len(tmp_embeddings)

        embeddings = tmp_embeddings
        ordering = tmp_ordering

    elif xAxis == 'rank':
        # reorder the embedddings based on the one embedding
        embeddings = np.array(embeddings)
        rank_embedding = np.array([embeddings[rank_idx]])
        dist = cdist(embeddings, rank_embedding, 'cosine').flatten()
        idx = np.argsort(dist)

        embeddings = embeddings[idx].tolist()
        ordering = idx.tolist()

    return jsonify({
        'embeddings': embeddings,
        'ordering': ordering,
        'cluster_idx': cluster_idx
    })


@backend_api.route("/get_embedding_names")
def get_embedding_names():
    """return the embeddings names for a dataset
    """
    return jsonify(model.hierarchy.get_embedding_names())


@backend_api.route("/get_zoom_levels")
def get_zoom_levels():
    """Return the zoom levels
    """
    return jsonify(model.hierarchy.get_zoom_levels())


@backend_api.route("/get_meta_data")
def get_meta_data():
    """Return meta data data
    """
    return jsonify(model.hierarchy.get_hierarchy_meta())


@backend_api.route("/zoom_in", methods=['POST'])
def zoom_in():
    """Zoom in
    """
    indx = json.loads(request.get_data())
    model.hierarchy.zoom_in(list(map(int, indx)))
    return {}


@backend_api.route("/zoom_out", methods=['POST'])
def zoom_out():
    """Zoom out
    """
    indx = json.loads(request.get_data())
    model.hierarchy.zoom_out(list(map(int, indx)))
    return {}


@backend_api.route("/graphs", methods=['POST'])
def get_graphs():
    """Return the graphs of n indices
    """
    indx = list(map(int, json.loads(request.get_data())))

    G = model.hierarchy.get_graph(indx)

    if (G):
        return json_graph.node_link_data(G)
    return {}
