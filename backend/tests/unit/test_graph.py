from sosuv.domain.graph import Graph


def test_start_nodes_and_parents() -> None:
    g = Graph.build(["a", "b", "c", "d"], [("a", "c"), ("b", "c"), ("c", "d")])
    assert g.start_nodes == ("a", "b")
    assert g.parents["c"] == ("a", "b")
    assert g.find_cycle() is None


def test_cycle_is_found() -> None:
    g = Graph.build(["a", "b", "c"], [("a", "b"), ("b", "c"), ("c", "a")])
    cycle = g.find_cycle()
    assert cycle is not None and cycle[0] == cycle[-1]
