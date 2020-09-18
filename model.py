# -*- coding: utf-8 -*-
"""
model - the multiscale temporal aggregation implementation with the hierarchy
"""

# Author: Eren Cakmak <eren.cakmak@uni-konstanz.de>
#
# License: MIT

import pickle
import datetime
from collections import Counter
import math
import networkx as nx
import numpy as np
from sklearn.preprocessing import normalize

hierarchy = None

dataset_paths = [[
    'data/synthetic_data.pkl', 'data/synthetic_data_embeddings_100.pkl'
], ['data/synthetic_data.pkl', 'data/synthetic_data_embeddings_1000.pkl'],
                 ['data/reddit_graphs.pkl', 'data/reddit_embeddings.pkl']]

default_pixel_bars = 200


def load_data(index):
    """Load the graph data with the vectors.

        Keyword arguments:
        index -- index to the list of dataset paths
    """
    global hierarchy

    graph_file_path = dataset_paths[index][0]
    graph_embeddings_path = dataset_paths[index][1]

    with open(graph_file_path, 'rb') as f:
        graphs = pickle.load(f)
    with open(graph_embeddings_path, 'rb') as f:
        embeddings = pickle.load(f)

    hierarchy = Hierarchy(graphs, embeddings)
    print('Data loading done.')


class Hierarchy:
    def __init__(self, graphs, embeddings):
        """Initialize the hierarchy from a list of graphs.

            Keyword arguments:
            graphs -- list of networkX graphs 
            embeddings -- all the embeddings
        """
        self.graphs = graphs
        self.levels = {}
        self.height = 1

        keys = np.array(embeddings.pop('keys', None))

        self.graph_embedding_names = []

        # normalization of the embeddings
        for key, value in embeddings.items():
            self.graph_embedding_names.append(key)

            # L2 normalization
            embeddings[key] = normalize(value)

        self.embeddings = embeddings

        # zoom level and zoom data
        self.selected_embedding_name = self.graph_embedding_names[0]
        self.zoom_level = []
        self.zoom_data = []

        window = 1
        while window < len(self.graphs):

            # get the embeddings for the level
            level_vectors = {}
            for key, value in self.embeddings.items():
                level_vectors[key] = value[np.flatnonzero(
                    np.core.defchararray.find(keys,
                                              str(self.height) + '_') != -1)]

            # window size
            window = int(math.pow(2, (self.height - 1)))
            self.levels[self.height] = Level(self.graphs, self.height,
                                             level_vectors)

            # set zoom levels and zoom data
            # per default it is first time more default_pixel_bars time teps
            if len(self.zoom_level) == 0:
                if self.levels[self.height].get_number_snapshots(
                ) <= default_pixel_bars:
                    # get the number of embeddings in the initial level
                    level_len = len(self.levels[self.height].get_embeddings(
                        self.selected_embedding_name))
                    # zoom level is used for storing the zoom levels
                    self.zoom_level = np.full(level_len, self.height)

            self.height = self.height + 1

        self.update_data()

    def __repr__(self):
        return str(self.levels)

    def __str__(self):
        return str(self.levels)

    def get_hierarchy_meta(self):
        """Return the hierarchy as a dict
        """
        level_dict = {}
        for key, l in self.levels.items():
            level_dict[l.level] = {
                'level': l.level,
                'window_size': l.window_size
            }

        # time
        time1 = datetime.datetime.combine(
            self.graphs[0].graph['time'][0],
            datetime.time(self.graphs[0].graph['time'][1]))
        time2 = datetime.datetime.combine(
            self.graphs[-1].graph['time'][0],
            datetime.time(self.graphs[-1].graph['time'][1]))
        return {
            'height': self.height,
            'time_steps': len(self.graphs),
            'levels': level_dict,
            'time_1': time1,
            'time_2': time2
        }

    def get_snapshot(self, level, num):
        """Return the snapshot (level,num)
        """
        if level > self.height:
            print('Hierarchy height overflow')
            return None
        level = self.levels[level]
        return level.get_snapshot(num)

    def check_snapshot(
            self,
            level,
            num,
    ):
        """Return bool if level contains an element at position num
        """
        if level > self.height:
            return False
        level = self.levels[level]
        return level.check_snapshot(num)

    def get_embeddings(self):
        """Return the current embeddings
        """
        return self.zoom_data.tolist()

    def get_embedding_names(self):
        """Get the embeddings names
        """
        return self.graph_embedding_names

    def load_embedding(self, name):
        """Set the embedding 
        """
        self.selected_embedding_name = name
        self.update_data()

    def get_zoom_levels(self):
        """get the zoom levels 
        """
        time_intervals = []

        time = datetime.datetime.combine(
            self.graphs[0].graph['time'][0],
            datetime.time(self.graphs[0].graph['time'][1]))

        # iterate and find levels
        for i, l in enumerate(self.zoom_level):
            time1, time2 = self.levels[l].get_interval(time)
            time_intervals.append([str(time1), str(time2)])
            time = time2

        return {'data': self.zoom_level.tolist(), 'time': time_intervals}

    def update_data(self):
        """Update the zoom data
        """
        self.zoom_data = []
        time = datetime.datetime.combine(
            self.graphs[0].graph['time'][0],
            datetime.time(self.graphs[0].graph['time'][1]))

        for l in self.zoom_level:
            embedding, time = self.levels[l].get_one_embedding(
                self.selected_embedding_name, time)
            self.zoom_data.append(embedding)

        self.zoom_data = np.array(self.zoom_data)

    def zoom_in(self, indx):
        """Zoom in 
        """
        new_zoom = []
        time = datetime.datetime.combine(
            self.graphs[0].graph['time'][0],
            datetime.time(self.graphs[0].graph['time'][1]))

        # iterate and find levels
        for i, l in enumerate(self.zoom_level):
            time1, time = self.levels[l].get_interval(time)

            if i in indx and l > 1:
                new_level = l - 1
                num_snaps = self.levels[new_level].num_snaps_in_interval(
                    time1, time)
                new_zoom.extend([new_level] * num_snaps)
            else:
                new_zoom.append(l)

        # update the zoom level and reload data
        self.zoom_level = np.array(new_zoom)
        self.update_data()

    def zoom_out(self, indx):
        """zoom out
        """
        new_zoom = []
        time = datetime.datetime.combine(
            self.graphs[0].graph['time'][0],
            datetime.time(self.graphs[0].graph['time'][1]))

        drill_up_intervals = []
        # iterate and find levels
        for i, l in enumerate(self.zoom_level):
            time1, time = self.levels[l].get_interval(time)

            if i in indx and l < self.height:
                drill_up_intervals.append(self.levels[l + 1].is_in_interval(
                    time1, time))

        # get first pop up interval
        time3, time4 = drill_up_intervals.pop(0)

        time = datetime.datetime.combine(
            self.graphs[0].graph['time'][0],
            datetime.time(self.graphs[0].graph['time'][1]))

        skip = False

        for i, l in enumerate(self.zoom_level):
            time1, time2 = self.levels[l].get_interval(time)

            # pop if the interval if larger then the end of the
            # drill up interval
            if time1 >= time4 and len(drill_up_intervals):
                time3, time4 = drill_up_intervals.pop(0)

            # zoom levels time is lower than the drill up interval
            if time1 < time3 and time2 < time4:
                new_zoom.append(l)
                skip = False
            # level is in the zoom level interval
            elif time3 <= time1 <= time2 <= time4:

                if not skip and self.height >= l + 1:
                    new_zoom.append(l + 1)
                    skip = True
            # this is called if all drill up intervals are popped
            elif time1 >= time4:
                new_zoom.append(l)

            time = time2

        # update the zoom level and reload data
        self.zoom_level = np.array(new_zoom)
        self.update_data()

    def get_graph(self, indx):
        """Get the summary graph for the indices
            Keyword arguments:
            indx -- positions of the graphs in the zoom level 
        """
        time = datetime.datetime.combine(
            self.graphs[0].graph['time'][0],
            datetime.time(self.graphs[0].graph['time'][1]))

        graphs = []
        # iterate and find levels
        for i, l in enumerate(self.zoom_level):
            time1, time2 = self.levels[l].get_interval(time)
            if i in indx:
                G = self.levels[l].get_graph(time1)
                graphs.append(G)
            time = time2

        # union / intersection / disjoint for graphs
        # occurences of nodes over time in a dict
        nodes = []
        for g in graphs:
            nodes.append(g.nodes)
        # get number of occurences
        node_occ = Counter(x for xs in nodes for x in set(xs))

        # Union graph
        G = nx.Graph()
        for graph in graphs:
            G.add_nodes_from(graph.nodes(data=True))
            G.add_edges_from(graph.edges(data=True))

        # intersection
        nodes_dict = {
            x: node_occ[x]
            for x in node_occ if node_occ[x] == len(graphs)
        }
        H = G.subgraph([*nodes_dict])
        nx.set_node_attributes(H, 1, 'intersection')
        nx.set_edge_attributes(H, 1, 'intersection')
        G.add_nodes_from(H)
        G.add_edges_from(H.edges)

        # disjoint
        nodes_dict = {
            x: node_occ[x]
            for x in node_occ if node_occ[x] < len(graphs)
        }
        I = G.subgraph([*nodes_dict])
        nx.set_node_attributes(I, 1, 'disjoint')
        nx.set_edge_attributes(I, 1, 'disjoint')
        G.add_nodes_from(I)
        G.add_edges_from(I.edges)

        G.graph['time'] = [graphs[0].graph['time'], graphs[-1].graph['time']]

        return G


class Level:
    def __init__(self, graphs, level, embeddings):
        """Initialize a level from from a list of graphs.

            Keyword arguments:
            graphs -- list of networkX graphs 
            level -- number for the level used to create window size 
            embeddings -- embeddings of the level
        """
        self.graphs = graphs
        self.level = level
        self.window_size = int(math.pow(2, (level - 1)))
        self.embeddings = embeddings

        # initialize the snapshots
        if self.window_size < 1:
            raise ValueError('Window size of level below 1')

        if self.window_size > 0:
            self.snapshots = []
            indx = 0  # index for vectors
            for i in range(0, len(self.graphs), self.window_size):
                # get the vectors
                self.snapshots.append(
                    Snapshot(self.graphs, i, i + self.window_size))
                indx = indx + 1

    def __repr__(self):
        return 'Level: ' + str(self.level) + ' - ' + str(self.window_size)

    def __str__(self):
        return 'Level: ' + str(self.level) + ' - ' + str(self.window_size)

    def get_snapshot(self, num):
        """Return the snapshot (num) of type of graph 
        """
        if num > len(self.snapshots):
            print('Snapshot number is bigger than level')
            return None
        return self.snapshots[num].get_snapshot()

    def check_snapshot(self, num):
        """Return true if the snapshot is in the level 
        """
        if num < 0 or num >= len(self.snapshots):
            return False
        return True

    def get_embeddings(self, embedding_name):
        """Return the embeddings
        """
        return self.embeddings[embedding_name].tolist()

    def get_one_embedding(self, embedding_name, time):
        """Return the embeddings
        """
        for index, snap in enumerate(self.snapshots):
            time1, time2 = snap.get_time()
            # the second return var is the next time interval which is input
            if time < time1:
                return self.embeddings[embedding_name][index], time2

        return self.embeddings[embedding_name][-1], time2

    def get_number_snapshots(self):
        """Return the embeddings
        """
        return len(self.snapshots)

    def num_snaps_in_interval(self, time1, time2):
        """ Get the time steps
        """
        num_snaps = 0
        for snap in self.snapshots:
            (time3, time4) = snap.get_time()
            if time1 <= time3 and time4 <= time2:
                num_snaps = num_snaps + 1
        return num_snaps

    def get_interval(self, time):
        """ gets the interval which includes time1 and time2
        """
        for snap in self.snapshots:
            (time1, time2) = snap.get_time()
            if time < time1:
                # if time1 <= time <= time2:
                return time1, time2
        return time1, time2

    def is_in_interval(self, time1, time2):
        """ gets the interval which includes time1 and time2
        """
        num_snaps = 0
        for snap in self.snapshots:
            (time3, time4) = snap.get_time()
            if time3 <= time1 and time2 <= time4:
                return time3, time4

    def get_graph(self, time):
        """ gets the interval which includes time1 and time2
        """
        for snap in self.snapshots:
            (time1, time2) = snap.get_time()
            if time <= time1:
                # if time1 <= time <= time2:
                return snap.get_snapshot()


class Snapshot:
    def __init__(self, graphs, indx1, indx2):
        """Initialize snapshot from a list of graphs.

            Keyword arguments:
            graphs -- list of networkX graphs 
            indx1 -- first index in the overall graph list
            indx2 -- last index in the overall graph list
        """
        self.graphs = graphs[indx1:indx2]
        self.indx1 = indx1
        self.indx2 = indx2
        self.time1 = datetime.datetime.combine(
            self.graphs[0].graph['time'][0],
            datetime.time(self.graphs[0].graph['time'][1]))  # .item()
        self.time2 = datetime.datetime.combine(
            self.graphs[-1].graph['time'][0],
            datetime.time(self.graphs[-1].graph['time'][1]))  # .item()
        self.duration = self.time2 - self.time1
        self.union_g = None

    def __repr__(self):
        return 'Snapshot: ' + str(self.time1) + ' - ' + str(self.time2)

    def __str__(self):
        return 'Snapshot: ' + str(self.time1) + ' - ' + str(self.time2)

    def union_graph(self):
        # if already computed just return
        if not self.union_g:
            G = nx.Graph()
            for graph in self.graphs:
                G.add_nodes_from(graph.nodes(data=True))
                G.add_edges_from(graph.edges(data=True))

            G.graph['time'] = [self.time1, self.time2]
            self.union_g = G

        return self.union_g

    def get_snapshot(self):
        """Return the snapshot of type of graph. 
        """
        return self.union_graph()

    def get_time(self):
        """The time duration of the snapshot
        """
        return (self.time1, self.time2)